import { Router } from "express";
import { calendarController } from "./calendar.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { listEventsQuerySchema, createEventSchema } from "./calendar.schema";

export const calendarRouter = Router();

/**
 * @openapi
 * /calendar:
 *   get:
 *     summary: List economic calendar events (defaults to today; public)
 *     tags: [Calendar]
 */
calendarRouter.get(
  "/",
  asyncHandler(calendarController.list),
);

/**
 * @openapi
 * /calendar:
 *   post:
 *     summary: Create an economic calendar event (admin/editor only)
 *     tags: [Calendar]
 */
calendarRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "EDITOR"),
  validate(createEventSchema),
  asyncHandler(calendarController.create),
);
