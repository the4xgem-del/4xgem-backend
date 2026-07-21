"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataProvider = void 0;
exports.getMarketDataHealth = getMarketDataHealth;
exports.startMarketData = startMarketData;
exports.stopMarketData = stopMarketData;
exports.getCachedPrice = getCachedPrice;
exports.getAllCachedPrices = getAllCachedPrices;
exports.computeFloatingPips = computeFloatingPips;
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const redis_1 = require("../../lib/redis");
const simulatedProvider_1 = require("./simulatedProvider");
const twelveDataProvider_1 = require("./twelveDataProvider");
const instruments_1 = require("./instruments");
const monitor_1 = require("./monitor");
/**
 * Provider selection, driven entirely by env vars:
 *
 *   MARKET_DATA_PROVIDER=simulated                → SimulatedProvider, always.
 *   MARKET_DATA_PROVIDER=twelvedata + API key set  → TwelveDataProvider (real data).
 *   MARKET_DATA_PROVIDER=twelvedata, no API key,
 *     NODE_ENV=development                         → falls back to SimulatedProvider
 *                                                     with a loud warning, so local dev
 *                                                     works out of the box without a key.
 *   MARKET_DATA_PROVIDER=twelvedata, no API key,
 *     NODE_ENV=staging|production                  → throws at startup. Silently
 *                                                     serving fake prices as if they
 *                                                     were real market data in a
 *                                                     production deployment is a
 *                                                     correctness/trust bug, not a
 *                                                     convenience worth keeping — fail
 *                                                     fast and loud instead.
 *
 * Everything downstream of this factory (the WebSocket broadcaster, the
 * signal auto-update watcher, the REST snapshot route, `server.ts`) only
 * ever touches the `IMarketDataProvider` interface.
 */
function createProvider() {
    if (env_1.env.MARKET_DATA_PROVIDER === "simulated") {
        return new simulatedProvider_1.SimulatedProvider();
    }
    // MARKET_DATA_PROVIDER === "twelvedata"
    if (env_1.env.TWELVE_DATA_API_KEY) {
        return new twelveDataProvider_1.TwelveDataProvider();
    }
    if (env_1.env.NODE_ENV === "development") {
        logger_1.logger.warn("MARKET_DATA_PROVIDER=twelvedata but TWELVE_DATA_API_KEY is not set — " +
            "falling back to the simulated provider because NODE_ENV=development. " +
            "This fallback does NOT apply outside development; set TWELVE_DATA_API_KEY " +
            "or MARKET_DATA_PROVIDER=simulated explicitly for staging/production.");
        return new simulatedProvider_1.SimulatedProvider();
    }
    throw new Error("MARKET_DATA_PROVIDER=twelvedata requires TWELVE_DATA_API_KEY to be set. " +
        "Refusing to start with fake market data outside development — set the API key, " +
        "or explicitly set MARKET_DATA_PROVIDER=simulated if that's really intended.");
}
const PRICE_CACHE_PREFIX = "market:price:";
exports.marketDataProvider = createProvider();
const monitor = new monitor_1.MarketDataMonitor(exports.marketDataProvider);
function getMarketDataHealth() {
    return monitor.getHealth();
}
let started = false;
/** Starts the provider once per process and mirrors every tick into Redis so any backend instance can read the latest price. */
async function startMarketData() {
    if (started)
        return;
    started = true;
    exports.marketDataProvider.on("tick", (tick) => {
        redis_1.redis.set(`${PRICE_CACHE_PREFIX}${tick.symbol}`, JSON.stringify(tick), "EX", 120).catch((err) => {
            logger_1.logger.error({ err }, "Failed to cache market data tick in Redis");
        });
    });
    exports.marketDataProvider.on("error", (err) => logger_1.logger.error({ err }, "Market data provider error"));
    exports.marketDataProvider.on("status", (status) => logger_1.logger.info({ status }, "Market data provider status"));
    await exports.marketDataProvider.start();
    logger_1.logger.info({ provider: env_1.env.MARKET_DATA_PROVIDER }, "Market data provider started");
}
function stopMarketData() {
    exports.marketDataProvider.stop();
}
async function getCachedPrice(symbol) {
    const raw = await redis_1.redis.get(`${PRICE_CACHE_PREFIX}${symbol}`);
    return raw ? JSON.parse(raw) : exports.marketDataProvider.getLatest(symbol);
}
async function getAllCachedPrices() {
    const inMemory = exports.marketDataProvider.getAllLatest();
    if (inMemory.length > 0)
        return inMemory;
    const keys = await redis_1.redis.keys(`${PRICE_CACHE_PREFIX}*`);
    if (keys.length === 0)
        return [];
    const values = await redis_1.redis.mget(...keys);
    return values.filter((v) => Boolean(v)).map((v) => JSON.parse(v));
}
/**
 * Floating result expressed in pips/points (not a dollar amount) — this
 * platform doesn't track position size (lot size) per signal, so a real
 * dollar P/L can't be computed honestly. Pips/points is the standard
 * broker-agnostic proxy and is what's shown live in the UI; a $ figure
 * would need a position-sizing feature first (tracked in docs/PROGRESS.md).
 */
function computeFloatingPips(pair, direction, entry, currentPrice) {
    const instrument = (0, instruments_1.instrumentForPair)(pair);
    if (!instrument)
        return null;
    const isLong = direction === "BUY" || direction === "BUY_LIMIT";
    const diff = isLong ? currentPrice - entry : entry - currentPrice;
    return Math.round((diff / instrument.pipSize) * 10) / 10;
}
//# sourceMappingURL=index.js.map