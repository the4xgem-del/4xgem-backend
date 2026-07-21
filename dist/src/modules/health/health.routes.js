"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const asyncHandler_1 = require("../../utils/asyncHandler");
exports.healthRouter = (0, express_1.Router)();
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness/readiness probe — checks DB and Redis connectivity
 *     tags: [Health]
 */
exports.healthRouter.get("/", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const checks = { database: "ok", redis: "ok" };
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
    }
    catch {
        checks.database = "down";
    }
    try {
        await redis_1.redis.ping();
    }
    catch {
        checks.redis = "down";
    }
    const healthy = Object.values(checks).every((v) => v === "ok");
    res.status(healthy ? 200 : 503).json({ status: healthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() });
}));
//# sourceMappingURL=health.routes.js.map