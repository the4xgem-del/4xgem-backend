"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitiveActionLimiter = exports.authLimiter = exports.apiLimiter = void 0;
exports.makeRateLimiter = makeRateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = require("rate-limit-redis");
const redis_1 = require("../lib/redis");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
/**
 * Builds a Redis-backed rate limiter so limits are enforced correctly across
 * multiple backend instances behind a load balancer (not per-process memory).
 */
function makeRateLimiter(opts) {
    return (0, express_rate_limit_1.default)({
        windowMs: opts.windowMs ?? env_1.env.RATE_LIMIT_WINDOW_MS,
        max: opts.max,
        standardHeaders: true,
        legacyHeaders: false,
        store: new rate_limit_redis_1.RedisStore({
            // @ts-expect-error rate-limit-redis's typing expects ioredis's call signature
            sendCommand: (...args) => redis_1.redis.call(...args),
            prefix: `rl:${opts.keyPrefix}:`,
        }),
        handler: (_req, _res, next) => next(ApiError_1.ApiError.tooMany()),
    });
}
/** Generic API-wide limiter. */
exports.apiLimiter = makeRateLimiter({ max: env_1.env.RATE_LIMIT_MAX, keyPrefix: "api" });
/** Tight limiter for auth endpoints prone to brute-force/credential stuffing. */
exports.authLimiter = makeRateLimiter({ max: env_1.isTest ? 1000 : 10, windowMs: 60_000, keyPrefix: "auth" });
/** Very tight limiter for password reset / email verification requests (prevents email bombing). */
exports.sensitiveActionLimiter = makeRateLimiter({ max: env_1.isTest ? 1000 : 5, windowMs: 15 * 60_000, keyPrefix: "sensitive" });
//# sourceMappingURL=rateLimit.middleware.js.map