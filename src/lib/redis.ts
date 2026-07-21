import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
redis.on("connect", () => logger.info("Redis connected"));

/** Simple JSON cache helpers used across services. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}
