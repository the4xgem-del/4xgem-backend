"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const marketData_1 = require("../../lib/marketData");
const instruments_1 = require("../../lib/marketData/instruments");
exports.marketRouter = (0, express_1.Router)();
/**
 * @openapi
 * /market/prices:
 *   get:
 *     summary: Snapshot of the latest known price for every watched instrument (public)
 *     tags: [Market]
 */
exports.marketRouter.get("/prices", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const ticks = await (0, marketData_1.getAllCachedPrices)();
    const byInstrument = instruments_1.WATCHED_INSTRUMENTS.map((instrument) => {
        const tick = ticks.find((t) => t.symbol === instrument.symbol);
        return {
            symbol: instrument.symbol,
            pair: instrument.displayPair,
            category: instrument.category,
            price: tick?.price ?? null,
            timestamp: tick?.timestamp ?? null,
        };
    });
    res.status(200).json({ data: byInstrument, ready: marketData_1.marketDataProvider.isReady() });
}));
/**
 * @openapi
 * /market/health:
 *   get:
 *     summary: Market data provider health — connection status, and tick rate/latency/reconnect/dropped-message metrics (public)
 *     tags: [Market]
 */
exports.marketRouter.get("/health", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const health = (0, marketData_1.getMarketDataHealth)();
    const httpStatus = health.healthStatus === "disconnected" ? 503 : 200;
    res.status(httpStatus).json({ data: health });
}));
//# sourceMappingURL=market.routes.js.map