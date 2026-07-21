import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { getAllCachedPrices, getMarketDataHealth, marketDataProvider } from "@/lib/marketData";
import { WATCHED_INSTRUMENTS } from "@/lib/marketData/instruments";

export const marketRouter = Router();

/**
 * @openapi
 * /market/prices:
 *   get:
 *     summary: Snapshot of the latest known price for every watched instrument (public)
 *     tags: [Market]
 */
marketRouter.get(
  "/prices",
  asyncHandler(async (_req, res) => {
    const ticks = await getAllCachedPrices();
    const byInstrument = WATCHED_INSTRUMENTS.map((instrument) => {
      const tick = ticks.find((t) => t.symbol === instrument.symbol);
      return {
        symbol: instrument.symbol,
        pair: instrument.displayPair,
        category: instrument.category,
        price: tick?.price ?? null,
        timestamp: tick?.timestamp ?? null,
      };
    });
    res.status(200).json({ data: byInstrument, ready: marketDataProvider.isReady() });
  }),
);

/**
 * @openapi
 * /market/health:
 *   get:
 *     summary: Market data provider health — connection status, and tick rate/latency/reconnect/dropped-message metrics (public)
 *     tags: [Market]
 */
marketRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const health = getMarketDataHealth();
    const httpStatus = health.healthStatus === "disconnected" ? 503 : 200;
    res.status(httpStatus).json({ data: health });
  }),
);
