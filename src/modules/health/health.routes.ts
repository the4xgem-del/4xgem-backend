import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { asyncHandler } from "@/utils/asyncHandler";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness/readiness probe — checks DB and Redis connectivity
 *     tags: [Health]
 */
healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const checks: Record<string, "ok" | "down"> = { database: "ok", redis: "ok" };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = "down";
    }

    try {
      await redis.ping();
    } catch {
      checks.redis = "down";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");
    res.status(healthy ? 200 : 503).json({ status: healthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() });
  }),
);
