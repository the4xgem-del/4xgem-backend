import { Router } from "express";
import { analyticsService } from "./analytics.service";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";

export const analyticsRouter = Router();

/**
 * @openapi
 * /analytics/performance:
 *   get:
 *     summary: Monthly pips + win rate for the performance chart
 *     tags: [Analytics]
 */
analyticsRouter.get(
  "/performance",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await analyticsService.performance();
    res.status(200).json({ data });
  }),
);

/**
 * @openapi
 * /analytics/category-breakdown:
 *   get:
 *     summary: Signal distribution by instrument category, for the pie chart
 *     tags: [Analytics]
 */
analyticsRouter.get(
  "/category-breakdown",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await analyticsService.categoryBreakdown();
    res.status(200).json({ data });
  }),
);

/**
 * @openapi
 * /analytics/admin-summary:
 *   get:
 *     summary: High-level platform stats for the admin dashboard (admin only)
 *     tags: [Admin]
 */
analyticsRouter.get(
  "/admin-summary",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const data = await analyticsService.adminSummary();
    res.status(200).json({ data });
  }),
);
