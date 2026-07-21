"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalsRouter = void 0;
const express_1 = require("express");
const signals_controller_1 = require("./signals.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const signals_schema_1 = require("./signals.schema");
exports.signalsRouter = (0, express_1.Router)();
/**
 * @openapi
 * /signals:
 *   get:
 *     summary: List trading signals (fields beyond status/confidence are masked unless your plan tier covers the signal)
 *     tags: [Signals]
 */
exports.signalsRouter.get("/", auth_middleware_1.optionalAuth, (0, validate_middleware_1.validate)(signals_schema_1.listSignalsQuerySchema, "query"), (0, asyncHandler_1.asyncHandler)(signals_controller_1.signalsController.list));
/**
 * @openapi
 * /signals/{id}:
 *   get:
 *     summary: Get a single signal by id
 *     tags: [Signals]
 */
exports.signalsRouter.get("/:id", auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(signals_controller_1.signalsController.getById));
/**
 * @openapi
 * /signals:
 *   post:
 *     summary: Create a new signal (analyst/admin only)
 *     tags: [Signals]
 */
exports.signalsRouter.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN", "ANALYST"), (0, validate_middleware_1.validate)(signals_schema_1.createSignalSchema), (0, asyncHandler_1.asyncHandler)(signals_controller_1.signalsController.create));
//# sourceMappingURL=signals.routes.js.map