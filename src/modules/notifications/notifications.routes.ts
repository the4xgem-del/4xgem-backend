import { Router } from "express";
import { notificationsController } from "./notifications.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth } from "@/middleware/auth.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import { listNotificationsQuerySchema } from "./notifications.schema";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List my notifications
 *     tags: [Notifications]
 */
notificationsRouter.get("/", validate(listNotificationsQuerySchema, "query"), asyncHandler(notificationsController.list));

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get my unread notification count
 *     tags: [Notifications]
 */
notificationsRouter.get("/unread-count", asyncHandler(notificationsController.unreadCount));

/**
 * @openapi
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 */
notificationsRouter.post("/:id/read", asyncHandler(notificationsController.markRead));

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     summary: Mark all my notifications as read
 *     tags: [Notifications]
 */
notificationsRouter.post("/read-all", asyncHandler(notificationsController.markAllRead));
