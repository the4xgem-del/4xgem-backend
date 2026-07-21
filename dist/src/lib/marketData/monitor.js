"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataMonitor = void 0;
const logger_1 = require("../../utils/logger");
const TICK_RATE_WINDOW_MS = 60_000;
const LATENCY_SAMPLE_SIZE = 50;
const DROPPED_MESSAGE_PREFIX = "dropped_message:";
function toHealthStatus(status) {
    switch (status.state) {
        case "streaming":
            return "connected";
        case "reconnecting":
            return "reconnecting";
        case "simulation":
            return "simulation";
        case "connecting":
        case "disconnected":
        default:
            return "disconnected";
    }
}
/**
 * Wraps any IMarketDataProvider purely by subscribing to its existing
 * "tick" / "status" / "error" events — it never touches provider internals
 * and the IMarketDataProvider interface is completely unchanged. This is
 * what makes it work identically for SimulatedProvider, TwelveDataProvider,
 * or any future provider without modification.
 */
class MarketDataMonitor {
    provider;
    providerName;
    startedAt = Date.now();
    currentStatus = { state: "connecting" };
    tickTimestamps = []; // for rolling tick-rate calculation
    latencySamples = [];
    tickCount = 0;
    reconnectCount = 0;
    droppedMessages = 0;
    errorCount = 0;
    lastTickAt = null;
    constructor(provider) {
        this.provider = provider;
        this.providerName = provider.constructor.name;
        this.provider.on("tick", (tick) => this.onTick(tick));
        this.provider.on("status", (status) => this.onStatus(status));
        this.provider.on("error", (err) => this.onError(err));
    }
    onTick(tick) {
        const now = Date.now();
        this.tickCount += 1;
        this.lastTickAt = now;
        this.tickTimestamps.push(now);
        const cutoff = now - TICK_RATE_WINDOW_MS;
        while (this.tickTimestamps.length && this.tickTimestamps[0] < cutoff)
            this.tickTimestamps.shift();
        const latency = now - tick.timestamp;
        if (latency >= 0 && latency < 60_000) {
            this.latencySamples.push(latency);
            if (this.latencySamples.length > LATENCY_SAMPLE_SIZE)
                this.latencySamples.shift();
        }
    }
    onStatus(status) {
        const from = this.currentStatus.state;
        const to = status.state;
        if (to === "reconnecting")
            this.reconnectCount += 1;
        logger_1.logger.info({ provider: this.providerName, from, to, detail: status }, "Market data provider status transition");
        this.currentStatus = status;
    }
    onError(err) {
        this.errorCount += 1;
        if (err.message.startsWith(DROPPED_MESSAGE_PREFIX)) {
            this.droppedMessages += 1;
            logger_1.logger.warn({ provider: this.providerName, message: err.message }, "Market data message dropped");
        }
        else {
            logger_1.logger.error({ provider: this.providerName, err }, "Market data provider error");
        }
    }
    getHealth() {
        const avgLatencyMs = this.latencySamples.length > 0
            ? Math.round(this.latencySamples.reduce((sum, v) => sum + v, 0) / this.latencySamples.length)
            : null;
        return {
            providerName: this.providerName,
            healthStatus: toHealthStatus(this.currentStatus),
            detail: this.currentStatus,
            metrics: {
                tickCount: this.tickCount,
                tickRatePerMinute: this.tickTimestamps.length,
                avgLatencyMs,
                reconnectCount: this.reconnectCount,
                droppedMessages: this.droppedMessages,
                errorCount: this.errorCount,
                lastTickAt: this.lastTickAt,
                uptimeMs: Date.now() - this.startedAt,
            },
        };
    }
}
exports.MarketDataMonitor = MarketDataMonitor;
//# sourceMappingURL=monitor.js.map