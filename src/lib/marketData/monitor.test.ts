import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { MarketDataMonitor } from "@/lib/marketData/monitor";
import type { IMarketDataProvider, ProviderStatus, Tick } from "@/lib/marketData/types";

class FakeProvider extends EventEmitter implements IMarketDataProvider {
  async start(): Promise<void> {}
  stop(): void {}
  isReady(): boolean {
    return true;
  }
  getLatest(): Tick | null {
    return null;
  }
  getAllLatest(): Tick[] {
    return [];
  }
}

describe("MarketDataMonitor", () => {
  let provider: FakeProvider;
  let monitor: MarketDataMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    provider = new FakeProvider();
    monitor = new MarketDataMonitor(provider);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in a disconnected-equivalent state before any status event", () => {
    const health = monitor.getHealth();
    expect(health.healthStatus).toBe("disconnected");
    expect(health.metrics.tickCount).toBe(0);
  });

  it("maps 'streaming' status to healthStatus 'connected'", () => {
    provider.emit("status", { state: "streaming", mode: "websocket" } satisfies ProviderStatus);
    expect(monitor.getHealth().healthStatus).toBe("connected");
  });

  it("maps 'simulation' status to healthStatus 'simulation'", () => {
    provider.emit("status", { state: "simulation" } satisfies ProviderStatus);
    expect(monitor.getHealth().healthStatus).toBe("simulation");
  });

  it("maps 'reconnecting' status to healthStatus 'reconnecting' and increments reconnectCount", () => {
    provider.emit("status", { state: "reconnecting", attempt: 1, nextRetryMs: 1000 } satisfies ProviderStatus);
    const health = monitor.getHealth();
    expect(health.healthStatus).toBe("reconnecting");
    expect(health.metrics.reconnectCount).toBe(1);
  });

  it("counts multiple reconnecting transitions cumulatively", () => {
    provider.emit("status", { state: "reconnecting", attempt: 1, nextRetryMs: 1000 } satisfies ProviderStatus);
    provider.emit("status", { state: "streaming", mode: "websocket" } satisfies ProviderStatus);
    provider.emit("status", { state: "reconnecting", attempt: 2, nextRetryMs: 2000 } satisfies ProviderStatus);
    expect(monitor.getHealth().metrics.reconnectCount).toBe(2);
  });

  it("maps 'disconnected' (circuit open) status to healthStatus 'disconnected'", () => {
    provider.emit("status", { state: "disconnected", reason: "too many failures", circuitOpen: true } satisfies ProviderStatus);
    const health = monitor.getHealth();
    expect(health.healthStatus).toBe("disconnected");
    expect(health.detail).toEqual({ state: "disconnected", reason: "too many failures", circuitOpen: true });
  });

  it("tracks tick count and lastTickAt", () => {
    provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: Date.now() } satisfies Tick);
    provider.emit("tick", { symbol: "XAU/USD", price: 2345.5, timestamp: Date.now() } satisfies Tick);
    const health = monitor.getHealth();
    expect(health.metrics.tickCount).toBe(2);
    expect(health.metrics.lastTickAt).toBe(Date.now());
  });

  it("computes tick rate over a rolling 60s window, excluding older ticks", () => {
    provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: Date.now() } satisfies Tick);
    vi.advanceTimersByTime(30_000);
    provider.emit("tick", { symbol: "EUR/USD", price: 1.086, timestamp: Date.now() } satisfies Tick);
    expect(monitor.getHealth().metrics.tickRatePerMinute).toBe(2);

    vi.advanceTimersByTime(31_000);
    provider.emit("tick", { symbol: "EUR/USD", price: 1.087, timestamp: Date.now() } satisfies Tick);
    expect(monitor.getHealth().metrics.tickRatePerMinute).toBe(2);
  });

  it("computes average latency from tick.timestamp vs receipt time", () => {
    const now = Date.now();
    provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: now - 100 } satisfies Tick);
    provider.emit("tick", { symbol: "EUR/USD", price: 1.086, timestamp: now - 200 } satisfies Tick);
    expect(monitor.getHealth().metrics.avgLatencyMs).toBe(150);
  });

  it("ignores absurd latency samples (clock skew / bad timestamps) rather than skewing the average", () => {
    const now = Date.now();
    provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: now - 100 } satisfies Tick);
    provider.emit("tick", { symbol: "EUR/USD", price: 1.086, timestamp: now + 999_999 } satisfies Tick);
    expect(monitor.getHealth().metrics.avgLatencyMs).toBe(100);
  });

  it("classifies errors prefixed 'dropped_message:' as dropped messages, others as generic errors", () => {
    provider.emit("error", new Error("dropped_message: invalid JSON"));
    provider.emit("error", new Error("dropped_message: unrecognized payload"));
    provider.emit("error", new Error("some other connection error"));

    const health = monitor.getHealth();
    expect(health.metrics.droppedMessages).toBe(2);
    expect(health.metrics.errorCount).toBe(3);
  });

  it("logs a structured message for every status transition", async () => {
    const { logger } = await import("@/utils/logger");
    const infoSpy = vi.spyOn(logger, "info");

    provider.emit("status", { state: "streaming", mode: "websocket" } satisfies ProviderStatus);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "FakeProvider", from: "connecting", to: "streaming" }),
      "Market data provider status transition",
    );
  });

  it("reports uptime as time elapsed since the monitor was created", () => {
    vi.advanceTimersByTime(5000);
    expect(monitor.getHealth().metrics.uptimeMs).toBe(5000);
  });
});
