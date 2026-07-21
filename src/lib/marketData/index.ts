import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { redis } from "@/lib/redis";
import { SimulatedProvider } from "./simulatedProvider";
import { TwelveDataProvider } from "./twelveDataProvider";
import { instrumentForPair } from "./instruments";
import { MarketDataMonitor, type ProviderHealth } from "./monitor";
import type { IMarketDataProvider, Tick } from "./types";

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
function createProvider(): IMarketDataProvider {
  if (env.MARKET_DATA_PROVIDER === "simulated") {
    return new SimulatedProvider();
  }

  // MARKET_DATA_PROVIDER === "twelvedata"
  if (env.TWELVE_DATA_API_KEY) {
    return new TwelveDataProvider();
  }

  if (env.NODE_ENV === "development") {
    logger.warn(
      "MARKET_DATA_PROVIDER=twelvedata but TWELVE_DATA_API_KEY is not set — " +
        "falling back to the simulated provider because NODE_ENV=development. " +
        "This fallback does NOT apply outside development; set TWELVE_DATA_API_KEY " +
        "or MARKET_DATA_PROVIDER=simulated explicitly for staging/production.",
    );
    return new SimulatedProvider();
  }

  throw new Error(
    "MARKET_DATA_PROVIDER=twelvedata requires TWELVE_DATA_API_KEY to be set. " +
      "Refusing to start with fake market data outside development — set the API key, " +
      "or explicitly set MARKET_DATA_PROVIDER=simulated if that's really intended.",
  );
}

const PRICE_CACHE_PREFIX = "market:price:";

export const marketDataProvider: IMarketDataProvider = createProvider();
const monitor = new MarketDataMonitor(marketDataProvider);

export function getMarketDataHealth(): ProviderHealth {
  return monitor.getHealth();
}

let started = false;

/** Starts the provider once per process and mirrors every tick into Redis so any backend instance can read the latest price. */
export async function startMarketData(): Promise<void> {
  if (started) return;
  started = true;

  marketDataProvider.on("tick", (tick: Tick) => {
    redis.set(`${PRICE_CACHE_PREFIX}${tick.symbol}`, JSON.stringify(tick), "EX", 120).catch((err) => {
      logger.error({ err }, "Failed to cache market data tick in Redis");
    });
  });

  marketDataProvider.on("error", (err) => logger.error({ err }, "Market data provider error"));
  marketDataProvider.on("status", (status) => logger.info({ status }, "Market data provider status"));

  await marketDataProvider.start();
  logger.info({ provider: env.MARKET_DATA_PROVIDER }, "Market data provider started");
}

export function stopMarketData(): void {
  marketDataProvider.stop();
}

export async function getCachedPrice(symbol: string): Promise<Tick | null> {
  const raw = await redis.get(`${PRICE_CACHE_PREFIX}${symbol}`);
  return raw ? (JSON.parse(raw) as Tick) : marketDataProvider.getLatest(symbol);
}

export async function getAllCachedPrices(): Promise<Tick[]> {
  const inMemory = marketDataProvider.getAllLatest();
  if (inMemory.length > 0) return inMemory;
  const keys = await redis.keys(`${PRICE_CACHE_PREFIX}*`);
  if (keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return values.filter((v): v is string => Boolean(v)).map((v) => JSON.parse(v) as Tick);
}

/**
 * Floating result expressed in pips/points (not a dollar amount) — this
 * platform doesn't track position size (lot size) per signal, so a real
 * dollar P/L can't be computed honestly. Pips/points is the standard
 * broker-agnostic proxy and is what's shown live in the UI; a $ figure
 * would need a position-sizing feature first (tracked in docs/PROGRESS.md).
 */
export function computeFloatingPips(
  pair: string,
  direction: "BUY" | "SELL" | "BUY_LIMIT" | "SELL_LIMIT",
  entry: number,
  currentPrice: number,
): number | null {
  const instrument = instrumentForPair(pair);
  if (!instrument) return null;

  const isLong = direction === "BUY" || direction === "BUY_LIMIT";
  const diff = isLong ? currentPrice - entry : entry - currentPrice;
  return Math.round((diff / instrument.pipSize) * 10) / 10;
}
