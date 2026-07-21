"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_1 = require("events");
const monitor_1 = require("../../lib/marketData/monitor");
class FakeProvider extends events_1.EventEmitter {
    async start() { }
    stop() { }
    isReady() {
        return true;
    }
    getLatest() {
        return null;
    }
    getAllLatest() {
        return [];
    }
}
(0, vitest_1.describe)("MarketDataMonitor", () => {
    let provider;
    let monitor;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
        provider = new FakeProvider();
        monitor = new monitor_1.MarketDataMonitor(provider);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)("starts in a disconnected-equivalent state before any status event", () => {
        const health = monitor.getHealth();
        (0, vitest_1.expect)(health.healthStatus).toBe("disconnected");
        (0, vitest_1.expect)(health.metrics.tickCount).toBe(0);
    });
    (0, vitest_1.it)("maps 'streaming' status to healthStatus 'connected'", () => {
        provider.emit("status", { state: "streaming", mode: "websocket" });
        (0, vitest_1.expect)(monitor.getHealth().healthStatus).toBe("connected");
    });
    (0, vitest_1.it)("maps 'simulation' status to healthStatus 'simulation'", () => {
        provider.emit("status", { state: "simulation" });
        (0, vitest_1.expect)(monitor.getHealth().healthStatus).toBe("simulation");
    });
    (0, vitest_1.it)("maps 'reconnecting' status to healthStatus 'reconnecting' and increments reconnectCount", () => {
        provider.emit("status", { state: "reconnecting", attempt: 1, nextRetryMs: 1000 });
        const health = monitor.getHealth();
        (0, vitest_1.expect)(health.healthStatus).toBe("reconnecting");
        (0, vitest_1.expect)(health.metrics.reconnectCount).toBe(1);
    });
    (0, vitest_1.it)("counts multiple reconnecting transitions cumulatively", () => {
        provider.emit("status", { state: "reconnecting", attempt: 1, nextRetryMs: 1000 });
        provider.emit("status", { state: "streaming", mode: "websocket" });
        provider.emit("status", { state: "reconnecting", attempt: 2, nextRetryMs: 2000 });
        (0, vitest_1.expect)(monitor.getHealth().metrics.reconnectCount).toBe(2);
    });
    (0, vitest_1.it)("maps 'disconnected' (circuit open) status to healthStatus 'disconnected'", () => {
        provider.emit("status", { state: "disconnected", reason: "too many failures", circuitOpen: true });
        const health = monitor.getHealth();
        (0, vitest_1.expect)(health.healthStatus).toBe("disconnected");
        (0, vitest_1.expect)(health.detail).toEqual({ state: "disconnected", reason: "too many failures", circuitOpen: true });
    });
    (0, vitest_1.it)("tracks tick count and lastTickAt", () => {
        provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: Date.now() });
        provider.emit("tick", { symbol: "XAU/USD", price: 2345.5, timestamp: Date.now() });
        const health = monitor.getHealth();
        (0, vitest_1.expect)(health.metrics.tickCount).toBe(2);
        (0, vitest_1.expect)(health.metrics.lastTickAt).toBe(Date.now());
    });
    (0, vitest_1.it)("computes tick rate over a rolling 60s window, excluding older ticks", () => {
        provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: Date.now() });
        vitest_1.vi.advanceTimersByTime(30_000);
        provider.emit("tick", { symbol: "EUR/USD", price: 1.086, timestamp: Date.now() });
        (0, vitest_1.expect)(monitor.getHealth().metrics.tickRatePerMinute).toBe(2);
        vitest_1.vi.advanceTimersByTime(31_000);
        provider.emit("tick", { symbol: "EUR/USD", price: 1.087, timestamp: Date.now() });
        (0, vitest_1.expect)(monitor.getHealth().metrics.tickRatePerMinute).toBe(2);
    });
    (0, vitest_1.it)("computes average latency from tick.timestamp vs receipt time", () => {
        const now = Date.now();
        provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: now - 100 });
        provider.emit("tick", { symbol: "EUR/USD", price: 1.086, timestamp: now - 200 });
        (0, vitest_1.expect)(monitor.getHealth().metrics.avgLatencyMs).toBe(150);
    });
    (0, vitest_1.it)("ignores absurd latency samples (clock skew / bad timestamps) rather than skewing the average", () => {
        const now = Date.now();
        provider.emit("tick", { symbol: "EUR/USD", price: 1.085, timestamp: now - 100 });
        provider.emit("tick", { symbol: "EUR/USD", price: 1.086, timestamp: now + 999_999 });
        (0, vitest_1.expect)(monitor.getHealth().metrics.avgLatencyMs).toBe(100);
    });
    (0, vitest_1.it)("classifies errors prefixed 'dropped_message:' as dropped messages, others as generic errors", () => {
        provider.emit("error", new Error("dropped_message: invalid JSON"));
        provider.emit("error", new Error("dropped_message: unrecognized payload"));
        provider.emit("error", new Error("some other connection error"));
        const health = monitor.getHealth();
        (0, vitest_1.expect)(health.metrics.droppedMessages).toBe(2);
        (0, vitest_1.expect)(health.metrics.errorCount).toBe(3);
    });
    (0, vitest_1.it)("logs a structured message for every status transition", async () => {
        const { logger } = await Promise.resolve().then(() => __importStar(require("../../utils/logger")));
        const infoSpy = vitest_1.vi.spyOn(logger, "info");
        provider.emit("status", { state: "streaming", mode: "websocket" });
        (0, vitest_1.expect)(infoSpy).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ provider: "FakeProvider", from: "connecting", to: "streaming" }), "Market data provider status transition");
    });
    (0, vitest_1.it)("reports uptime as time elapsed since the monitor was created", () => {
        vitest_1.vi.advanceTimersByTime(5000);
        (0, vitest_1.expect)(monitor.getHealth().metrics.uptimeMs).toBe(5000);
    });
});
//# sourceMappingURL=monitor.test.js.map