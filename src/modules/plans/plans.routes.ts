import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { asyncHandler } from "@/utils/asyncHandler";

export const plansRouter = Router();

/**
 * @openapi
 * /plans:
 *   get:
 *     summary: List active subscription plans (public — used by the pricing page)
 *     tags: [Plans]
 */
plansRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const cacheKey = "plans:active";
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) {
      res.status(200).json({ data: cached });
      return;
    }
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    });
    await cacheSet(cacheKey, plans, 300); // plans change rarely — 5 min TTL
    res.status(200).json({ data: plans });
  }),
);
