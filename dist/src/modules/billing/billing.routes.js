"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = void 0;
const express_1 = require("express");
const billing_service_1 = require("./billing.service");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const ApiError_1 = require("../../utils/ApiError");
const billing_schema_1 = require("./billing.schema");
exports.billingRouter = (0, express_1.Router)();
/**
 * @openapi
 * /billing/checkout-session:
 *   post:
 *     summary: Create a Stripe Checkout session for a plan
 *     tags: [Billing]
 */
exports.billingRouter.post("/checkout-session", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(billing_schema_1.createCheckoutSessionSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { planId } = req.body;
    const result = await billing_service_1.billingService.createCheckoutSession(req.user.id, planId);
    res.status(200).json({ data: result });
}));
/**
 * @openapi
 * /billing/portal-session:
 *   post:
 *     summary: Create a Stripe billing portal session (manage/cancel subscription)
 *     tags: [Billing]
 */
exports.billingRouter.post("/portal-session", auth_middleware_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await billing_service_1.billingService.createPortalSession(req.user.id);
    res.status(200).json({ data: result });
}));
/**
 * @openapi
 * /billing/webhook:
 *   post:
 *     summary: Stripe webhook receiver (signature-verified, no auth cookie)
 *     tags: [Billing]
 */
exports.billingRouter.post("/webhook", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
        throw ApiError_1.ApiError.badRequest("Missing Stripe-Signature header.");
    }
    // req.body is the raw Buffer here — see the express.raw() mount in app.ts
    // which must run BEFORE express.json() for this exact path.
    await billing_service_1.billingService.handleWebhook(req.body, signature);
    res.status(200).json({ received: true });
}));
//# sourceMappingURL=billing.routes.js.map