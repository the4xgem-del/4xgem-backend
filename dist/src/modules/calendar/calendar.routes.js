"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarRouter = void 0;
const express_1 = require("express");
const calendar_controller_1 = require("./calendar.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const calendar_schema_1 = require("./calendar.schema");
exports.calendarRouter = (0, express_1.Router)();
/**
 * @openapi
 * /calendar:
 *   get:
 *     summary: List economic calendar events (defaults to today; public)
 *     tags: [Calendar]
 */
exports.calendarRouter.get("/", (0, asyncHandler_1.asyncHandler)(calendar_controller_1.calendarController.list));
/**
 * @openapi
 * /calendar:
 *   post:
 *     summary: Create an economic calendar event (admin/editor only)
 *     tags: [Calendar]
 */
exports.calendarRouter.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN", "EDITOR"), (0, validate_middleware_1.validate)(calendar_schema_1.createEventSchema), (0, asyncHandler_1.asyncHandler)(calendar_controller_1.calendarController.create));
//# sourceMappingURL=calendar.routes.js.map