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
class FakeWebSocket extends events_1.EventEmitter {
    url;
    static instances = [];
    sent = [];
    closed = false;
    terminated = false;
    constructor(url) {
        super();
        this.url = url;
        FakeWebSocket.instances.push(this);
    }
    send(data) {
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
vitest_1.vi.mock("ws", () => ({
    default: FakeWebSocket,
    WebSocket: FakeWebSocket,
}));
async function importFreshProvider() {
    vitest_1.vi.resetModules();
    const mod = await Promise.resolve().then(() => __importStar(require("../../lib/marketData/twelveDataProvider")));
    return mod.TwelveDataProvider;
}
(0, vitest_1.describe)("TwelveDataProvider", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
        FakeWebSocket.instances = [];
        process.env.TWELVE_DATA_API_KEY = "test-key";
        process.env.MARKET_DATA_PROVIDER = "twelvedata";
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
        delete process.env.TWELVE_DATA_API_KEY;
        process.env.MARKET_DATA_PROVIDER = "simulated";
    });
    (0, vitest_1.it)("throws if started without an API key", async () => {
        delete process.env.TWELVE_DATA_API_KEY;
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        await (0, vitest_1.expect)(provider.start()).rejects.toThrow(/TWELVE_DATA_API_KEY/);
    });
    (0, vitest_1.it)("subscribes to the watchlist on connect and transitions to 'streaming' on subscribe-status ok", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const statuses = [];
        provider.on("status", (s) => statuses.push(s.state));
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        (0, vitest_1.expect)(JSON.parse(ws.sent[0])).toMatchObject({ action: "subscribe" });
        ws.emit("message", Buffer.from(JSON.stringify({ event: "subscribe-status", status: "ok" })));
        (0, vitest_1.expect)(statuses).toContain("streaming");
    });
    (0, vitest_1.it)("emits a tick and updates getLatest on a price event", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const ticks = [];
        provider.on("tick", (t) => ticks.push(t));
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        ws.emit("message", Buffer.from(JSON.stringify({ event: "price", symbol: "EUR/USD", price: 1.0876, timestamp: Date.now() / 1000 })));
        (0, vitest_1.expect)(ticks).toHaveLength(1);
        (0, vitest_1.expect)(provider.getLatest("EUR/USD")?.price).toBe(1.0876);
        (0, vitest_1.expect)(provider.isReady()).toBe(true);
    });
    (0, vitest_1.it)("falls back to REST polling when the WS subscribe is rejected", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const statuses = [];
        provider.on("status", (s) => statuses.push(s));
        global.fetch = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ "EUR/USD": { price: "1.0850" } }),
        });
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        ws.emit("message", Buffer.from(JSON.stringify({ event: "subscribe-status", status: "error" })));
        (0, vitest_1.expect)(statuses.some((s) => s.state === "streaming" && s.mode === "polling")).toBe(true);
        (0, vitest_1.expect)(ws.closed).toBe(true);
    });
    (0, vitest_1.it)("emits a dropped_message error on malformed JSON instead of crashing", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const errors = [];
        provider.on("error", (e) => errors.push(e));
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        ws.emit("message", Buffer.from("{not valid json"));
        (0, vitest_1.expect)(errors).toHaveLength(1);
        (0, vitest_1.expect)(errors[0].message).toMatch(/^dropped_message:/);
    });
    (0, vitest_1.it)("emits a dropped_message error for an unrecognized payload shape", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const errors = [];
        provider.on("error", (e) => errors.push(e));
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        ws.emit("message", Buffer.from(JSON.stringify({ event: "heartbeat-ack" })));
        (0, vitest_1.expect)(errors.some((e) => e.message.startsWith("dropped_message:"))).toBe(true);
    });
    (0, vitest_1.it)("schedules a reconnect with backoff on an unexpected close, reporting 'reconnecting' status", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const statuses = [];
        provider.on("status", (s) => statuses.push(s));
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        ws.emit("close");
        const reconnecting = statuses.find((s) => s.state === "reconnecting");
        (0, vitest_1.expect)(reconnecting).toBeDefined();
        (0, vitest_1.expect)(reconnecting.attempt).toBe(1);
        (0, vitest_1.expect)(reconnecting.nextRetryMs).toBeGreaterThan(0);
        vitest_1.vi.advanceTimersByTime(reconnecting.nextRetryMs + 100);
        (0, vitest_1.expect)(FakeWebSocket.instances.length).toBe(2);
    });
    (0, vitest_1.it)("opens the circuit breaker after repeated consecutive failures and reports disconnected(circuitOpen)", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const statuses = [];
        provider.on("status", (s) => statuses.push(s));
        await provider.start();
        for (let i = 0; i < 5; i++) {
            const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
            ws.emit("open");
            ws.emit("close");
            const last = statuses[statuses.length - 1];
            if (last.state === "reconnecting" && last.nextRetryMs) {
                vitest_1.vi.advanceTimersByTime(last.nextRetryMs + 100);
            }
        }
        const disconnected = statuses.find((s) => s.state === "disconnected" && s.circuitOpen);
        (0, vitest_1.expect)(disconnected).toBeDefined();
    });
    (0, vitest_1.it)("resets the circuit breaker and reconnect attempt count on a successful subscribe after failures", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        const statuses = [];
        provider.on("status", (s) => statuses.push(s));
        await provider.start();
        let ws = FakeWebSocket.instances[0];
        ws.emit("open");
        ws.emit("close");
        const reconnecting = statuses.find((s) => s.state === "reconnecting");
        vitest_1.vi.advanceTimersByTime(reconnecting.nextRetryMs + 100);
        ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
        ws.emit("open");
        ws.emit("message", Buffer.from(JSON.stringify({ event: "subscribe-status", status: "ok" })));
        statuses.length = 0;
        ws.emit("close");
        const firstReconnectAfterRecovery = statuses.find((s) => s.state === "reconnecting");
        (0, vitest_1.expect)(firstReconnectAfterRecovery.attempt).toBe(1);
    });
    (0, vitest_1.it)("stop() prevents any further reconnect attempts", async () => {
        const TwelveDataProvider = await importFreshProvider();
        const provider = new TwelveDataProvider();
        await provider.start();
        const ws = FakeWebSocket.instances[0];
        ws.emit("open");
        provider.stop();
        const countBeforeClose = FakeWebSocket.instances.length;
        ws.emit("close");
        vitest_1.vi.advanceTimersByTime(60_000);
        (0, vitest_1.expect)(FakeWebSocket.instances.length).toBe(countBeforeClose);
    });
});
//# sourceMappingURL=twelveDataProvider.test.js.map