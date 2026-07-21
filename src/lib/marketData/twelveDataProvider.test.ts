import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

class FakeWebSocket extends EventEmitter {
  static instances: FakeWebSocket[] = [];
  sent: string[] = [];
  closed = false;
  terminated = false;

  constructor(public url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.emit("close");
  }

  terminate() {
    this.terminated = true;
    this.emit("close");
  }
}

vi.mock("ws", () => ({
  default: FakeWebSocket,
  WebSocket: FakeWebSocket,
}));

async function importFreshProvider() {
  vi.resetModules();
  const mod = await import("@/lib/marketData/twelveDataProvider");
  return mod.TwelveDataProvider;
}

describe("TwelveDataProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    process.env.TWELVE_DATA_API_KEY = "test-key";
    process.env.MARKET_DATA_PROVIDER = "twelvedata";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.TWELVE_DATA_API_KEY;
    process.env.MARKET_DATA_PROVIDER = "simulated";
  });

  it("throws if started without an API key", async () => {
    delete process.env.TWELVE_DATA_API_KEY;
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    await expect(provider.start()).rejects.toThrow(/TWELVE_DATA_API_KEY/);
  });

  it("subscribes to the watchlist on connect and transitions to 'streaming' on subscribe-status ok", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const statuses: string[] = [];
    provider.on("status", (s) => statuses.push(s.state));

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");

    expect(JSON.parse(ws.sent[0])).toMatchObject({ action: "subscribe" });

    ws.emit("message", Buffer.from(JSON.stringify({ event: "subscribe-status", status: "ok" })));

    expect(statuses).toContain("streaming");
  });

  it("emits a tick and updates getLatest on a price event", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const ticks: unknown[] = [];
    provider.on("tick", (t) => ticks.push(t));

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");
    ws.emit("message", Buffer.from(JSON.stringify({ event: "price", symbol: "EUR/USD", price: 1.0876, timestamp: Date.now() / 1000 })));

    expect(ticks).toHaveLength(1);
    expect(provider.getLatest("EUR/USD")?.price).toBe(1.0876);
    expect(provider.isReady()).toBe(true);
  });

  it("falls back to REST polling when the WS subscribe is rejected", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const statuses: unknown[] = [];
    provider.on("status", (s) => statuses.push(s));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "EUR/USD": { price: "1.0850" } }),
    }) as unknown as typeof fetch;

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");
    ws.emit("message", Buffer.from(JSON.stringify({ event: "subscribe-status", status: "error" })));

    expect(statuses.some((s) => (s as { state: string }).state === "streaming" && (s as { mode: string }).mode === "polling")).toBe(true);
    expect(ws.closed).toBe(true);
  });

  it("emits a dropped_message error on malformed JSON instead of crashing", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const errors: Error[] = [];
    provider.on("error", (e) => errors.push(e));

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");
    ws.emit("message", Buffer.from("{not valid json"));

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/^dropped_message:/);
  });

  it("emits a dropped_message error for an unrecognized payload shape", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const errors: Error[] = [];
    provider.on("error", (e) => errors.push(e));

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");
    ws.emit("message", Buffer.from(JSON.stringify({ event: "heartbeat-ack" })));

    expect(errors.some((e) => e.message.startsWith("dropped_message:"))).toBe(true);
  });

  it("schedules a reconnect with backoff on an unexpected close, reporting 'reconnecting' status", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const statuses: unknown[] = [];
    provider.on("status", (s) => statuses.push(s));

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");
    ws.emit("close");

    const reconnecting = statuses.find((s) => (s as { state: string }).state === "reconnecting") as
      | { state: "reconnecting"; attempt: number; nextRetryMs: number }
      | undefined;
    expect(reconnecting).toBeDefined();
    expect(reconnecting!.attempt).toBe(1);
    expect(reconnecting!.nextRetryMs).toBeGreaterThan(0);

    vi.advanceTimersByTime(reconnecting!.nextRetryMs + 100);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it("opens the circuit breaker after repeated consecutive failures and reports disconnected(circuitOpen)", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const statuses: unknown[] = [];
    provider.on("status", (s) => statuses.push(s));

    await provider.start();

    for (let i = 0; i < 5; i++) {
      const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
      ws.emit("open");
      ws.emit("close");
      const last = statuses[statuses.length - 1] as { state: string; nextRetryMs?: number };
      if (last.state === "reconnecting" && last.nextRetryMs) {
        vi.advanceTimersByTime(last.nextRetryMs + 100);
      }
    }

    const disconnected = statuses.find(
      (s) => (s as { state: string }).state === "disconnected" && (s as { circuitOpen?: boolean }).circuitOpen,
    );
    expect(disconnected).toBeDefined();
  });

  it("resets the circuit breaker and reconnect attempt count on a successful subscribe after failures", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();
    const statuses: unknown[] = [];
    provider.on("status", (s) => statuses.push(s));

    await provider.start();
    let ws = FakeWebSocket.instances[0];
    ws.emit("open");
    ws.emit("close");

    const reconnecting = statuses.find((s) => (s as { state: string }).state === "reconnecting") as { nextRetryMs: number };
    vi.advanceTimersByTime(reconnecting.nextRetryMs + 100);

    ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.emit("open");
    ws.emit("message", Buffer.from(JSON.stringify({ event: "subscribe-status", status: "ok" })));

    statuses.length = 0;
    ws.emit("close");

    const firstReconnectAfterRecovery = statuses.find((s) => (s as { state: string }).state === "reconnecting") as { attempt: number };
    expect(firstReconnectAfterRecovery.attempt).toBe(1);
  });

  it("stop() prevents any further reconnect attempts", async () => {
    const TwelveDataProvider = await importFreshProvider();
    const provider = new TwelveDataProvider();

    await provider.start();
    const ws = FakeWebSocket.instances[0];
    ws.emit("open");
    provider.stop();
    const countBeforeClose = FakeWebSocket.instances.length;
    ws.emit("close");

    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances.length).toBe(countBeforeClose);
  });
});
