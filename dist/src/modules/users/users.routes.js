"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const users_schema_1 = require("./users.schema");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("ADMIN"));
/**
 * @openapi
 * /users:
 *   get:
 *     summary: List/search users (admin only)
 *     tags: [Admin]
 */
exports.usersRouter.get("/", (0, validate_middleware_1.validate)(users_schema_1.listUsersQuerySchema, "query"), (0, asyncHandler_1.asyncHandler)(users_controller_1.usersController.list));
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by id (admin only)
 *     tags: [Admin]
 */
exports.usersRouter.get("/:id", (0, asyncHandler_1.asyncHandler)(users_controller_1.usersController.getById));
/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update a user's role or status (admin only)
 *     tags: [Admin]
 */
exports.usersRouter.patch("/:id", (0, validate_middleware_1.validate)(users_schema_1.updateUserSchema), (0, asyncHandler_1.asyncHandler)(users_controller_1.usersController.update));
/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Soft-delete (deactivate) a user (admin only)
 *     tags: [Admin]
 */
exports.usersRouter.delete("/:id", (0, asyncHandler_1.asyncHandler)(users_controller_1.usersController.remove));
//# sourceMappingURL=users.routes.js.map