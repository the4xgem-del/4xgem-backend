"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const analytics_service_1 = require("./analytics.service");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
exports.analyticsRouter = (0, express_1.Router)();
/**
 * @openapi
 * /analytics/performance:
 *   get:
 *     summary: Monthly pips + win rate for the performance chart
 *     tags: [Analytics]
 */
exports.analyticsRouter.get("/performance", auth_middleware_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const data = await analytics_service_1.analyticsService.performance();
    res.status(200).json({ data });
}));
/**
 * @openapi
 * /analytics/category-breakdown:
 *   get:
 *     summary: Signal distribution by instrument category, for the pie chart
 *     tags: [Analytics]
 */
exports.analyticsRouter.get("/category-breakdown", auth_middleware_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const data = await analytics_service_1.analyticsService.categoryBreakdown();
    res.status(200).json({ data });
}));
/**
 * @openapi
 * /analytics/admin-summary:
 *   get:
 *     summary: High-level platform stats for the admin dashboard (admin only)
 *     tags: [Admin]
 */
exports.analyticsRouter.get("/admin-summary", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN"), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const data = await analytics_service_1.analyticsService.adminSummary();
    res.status(200).json({ data });
}));
//# sourceMappingURL=analytics.routes.js.map