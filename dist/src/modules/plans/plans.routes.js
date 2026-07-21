"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plansRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const redis_1 = require("../../lib/redis");
const asyncHandler_1 = require("../../utils/asyncHandler");
exports.plansRouter = (0, express_1.Router)();
/**
 * @openapi
 * /plans:
 *   get:
 *     summary: List active subscription plans (public — used by the pricing page)
 *     tags: [Plans]
 */
exports.plansRouter.get("/", (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const cacheKey = "plans:active";
    const cached = await (0, redis_1.cacheGet)(cacheKey);
    if (cached) {
        res.status(200).json({ data: cached });
        return;
    }
    const plans = await prisma_1.prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { priceCents: "asc" },
    });
    await (0, redis_1.cacheSet)(cacheKey, plans, 300); // plans change rarely — 5 min TTL
    res.status(200).json({ data: plans });
}));
//# sourceMappingURL=plans.routes.js.map