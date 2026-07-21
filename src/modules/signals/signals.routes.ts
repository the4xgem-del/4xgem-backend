import { Router } from "express";
import { signalsController } from "./signals.controller";
import { validate } from "@/middleware/validate.middleware";
import { optionalAuth, requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { listSignalsQuerySchema, createSignalSchema } from "./signals.schema";

export const signalsRouter = Router();

/**
 * @openapi
 * /signals:
 *   get:
 *     summary: List trading signals (fields beyond status/confidence are masked unless your plan tier covers the signal)
 *     tags: [Signals]
 */
signalsRouter.get(
  "/",
  optionalAuth,
  validate(listSignalsQuerySchema, "query"),
  asyncHandler(signalsController.list),
);

/**
 * @openapi
 * /signals/{id}:
 *   get:
 *     summary: Get a single signal by id
 *     tags: [Signals]
 */
signalsRouter.get("/:id", optionalAuth, asyncHandler(signalsController.getById));

/**
 * @openapi
 * /signals:
 *   post:
 *     summary: Create a new signal (analyst/admin only)
 *     tags: [Signals]
 */
signalsRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "ANALYST"),
  validate(createSignalSchema),
  asyncHandler(signalsController.create),
);
