"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const notifications_controller_1 = require("./notifications.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const notifications_schema_1 = require("./notifications.schema");
exports.notificationsRouter = (0, express_1.Router)();
exports.notificationsRouter.use(auth_middleware_1.requireAuth);
/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List my notifications
 *     tags: [Notifications]
 */
exports.notificationsRouter.get("/", (0, validate_middleware_1.validate)(notifications_schema_1.listNotificationsQuerySchema, "query"), (0, asyncHandler_1.asyncHandler)(notifications_controller_1.notificationsController.list));
/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get my unread notification count
 *     tags: [Notifications]
 */
exports.notificationsRouter.get("/unread-count", (0, asyncHandler_1.asyncHandler)(notifications_controller_1.notificationsController.unreadCount));
/**
 * @openapi
 * /notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 */
exports.notificationsRouter.post("/:id/read", (0, asyncHandler_1.asyncHandler)(notifications_controller_1.notificationsController.markRead));
/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     summary: Mark all my notifications as read
 *     tags: [Notifications]
 */
exports.notificationsRouter.post("/read-all", (0, asyncHandler_1.asyncHandler)(notifications_controller_1.notificationsController.markAllRead));
//# sourceMappingURL=notifications.routes.js.map