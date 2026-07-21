"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
exports.redis = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
});
exports.redis.on("error", (err) => logger_1.logger.error({ err }, "Redis connection error"));
exports.redis.on("connect", () => logger_1.logger.info("Redis connected"));
/** Simple JSON cache helpers used across services. */
async function cacheGet(key) {
    const raw = await exports.redis.get(key);
    return raw ? JSON.parse(raw) : null;
}
async function cacheSet(key, value, ttlSeconds) {
    await exports.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
async function cacheDel(key) {
    await exports.redis.del(key);
}
//# sourceMappingURL=redis.js.map