import { Router, Response } from "express";
import { billingService } from "./billing.service";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import type { AuthenticatedRequest } from "@/middleware/auth.middleware";
import { createCheckoutSessionSchema, type CreateCheckoutSessionInput } from "./billing.schema";

export const billingRouter = Router();

/**
 * @openapi
 * /billing/checkout-session:
 *   post:
 *     summary: Create a Stripe Checkout session for a plan
 *     tags: [Billing]
 */
billingRouter.post(
  "/checkout-session",
  requireAuth,
  validate(createCheckoutSessionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { planId } = req.body as CreateCheckoutSessionInput;
    const result = await billingService.createCheckoutSession(req.user!.id, planId);
    res.status(200).json({ data: result });
  }),
);

/**
 * @openapi
 * /billing/portal-session:
 *   post:
 *     summary: Create a Stripe billing portal session (manage/cancel subscription)
 *     tags: [Billing]
 */
billingRouter.post(
  "/portal-session",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await billingService.createPortalSession(req.user!.id);
    res.status(200).json({ data: result });
  }),
);

/**
 * @openapi
 * /billing/webhook:
 *   post:
 *     summary: Stripe webhook receiver (signature-verified, no auth cookie)
 *     tags: [Billing]
 */
billingRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      throw ApiError.badRequest("Missing Stripe-Signature header.");
    }
    // req.body is the raw Buffer here — see the express.raw() mount in app.ts
    // which must run BEFORE express.json() for this exact path.
    await billingService.handleWebhook(req.body as Buffer, signature);
    res.status(200).json({ received: true });
  }),
);
