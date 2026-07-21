import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "@/lib/redis";
import { env, isTest } from "@/config/env";
import { ApiError } from "@/utils/ApiError";

/**
 * Builds a Redis-backed rate limiter so limits are enforced correctly across
 * multiple backend instances behind a load balancer (not per-process memory).
 */
export function makeRateLimiter(opts: { windowMs?: number; max: number; keyPrefix: string }) {
  return rateLimit({
    windowMs: opts.windowMs ?? env.RATE_LIMIT_WINDOW_MS,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error rate-limit-redis's typing expects ioredis's call signature
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: `rl:${opts.keyPrefix}:`,
    }),
    handler: (_req, _res, next) => next(ApiError.tooMany()),
  });
}

/** Generic API-wide limiter. */
export const apiLimiter = makeRateLimiter({ max: env.RATE_LIMIT_MAX, keyPrefix: "api" });

/** Tight limiter for auth endpoints prone to brute-force/credential stuffing. */
export const authLimiter = makeRateLimiter({ max: isTest ? 1000 : 10, windowMs: 60_000, keyPrefix: "auth" });

/** Very tight limiter for password reset / email verification requests (prevents email bombing). */
export const sensitiveActionLimiter = makeRateLimiter({ max: isTest ? 1000 : 5, windowMs: 15 * 60_000, keyPrefix: "sensitive" });
