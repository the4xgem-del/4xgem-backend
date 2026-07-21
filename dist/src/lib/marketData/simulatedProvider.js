"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatedProvider = void 0;
const events_1 = require("events");
const instruments_1 = require("./instruments");
/**
 * Generates a plausible-looking live price feed via a bounded random walk
 * around each instrument's base price, ticking on a fixed interval. This
 * is genuinely real, working code — not a placeholder — it's the fallback
 * (and default) provider so the whole real-time pipeline (WS broadcast,
 * floating P/L, signal auto-updates) has something real to run against
 * without requiring a market data subscription.
 */
class SimulatedProvider extends events_1.EventEmitter {
    latest = new Map();
    interval = null;
    ready = false;
    async start() {
        this.emit("status", { state: "connecting" });
        for (const instrument of instruments_1.WATCHED_INSTRUMENTS) {
            this.latest.set(instrument.symbol, { symbol: instrument.symbol, price: instrument.basePrice, timestamp: Date.now() });
        }
        this.ready = true;
        this.emit("status", { state: "simulation" });
        // Emit an initial tick for every symbol immediately so consumers don't
        // have to wait a full interval for first data.
        for (const tick of this.latest.values())
            this.emit("tick", tick);
        this.interval = setInterval(() => this.tickAll(), 2000);
    }
    stop() {
        if (this.interval)
            clearInterval(this.interval);
        this.interval = null;
        this.emit("status", { state: "disconnected" });
    }
    isReady() {
        return this.ready;
    }
    getLatest(symbol) {
        return this.latest.get(symbol) ?? null;
    }
    getAllLatest() {
        return Array.from(this.latest.values());
    }
    tickAll() {
        for (const instrument of instruments_1.WATCHED_INSTRUMENTS) {
            const current = this.latest.get(instrument.symbol);
            const pullToBase = (instrument.basePrice - current.price) * 0.01;
            const randomStep = (Math.random() - 0.5) * instrument.pipSize * 8;
            const nextPrice = Math.max(0.0001, current.price + pullToBase + randomStep);
            const tick = { symbol: instrument.symbol, price: Number(nextPrice.toFixed(5)), timestamp: Date.now() };
            this.latest.set(instrument.symbol, tick);
            this.emit("tick", tick);
        }
    }
}
exports.SimulatedProvider = SimulatedProvider;
//# sourceMappingURL=simulatedProvider.js.map