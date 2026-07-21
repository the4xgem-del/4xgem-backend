"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const me_controller_1 = require("./me.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const me_schema_1 = require("./me.schema");
exports.meRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
exports.meRouter.use(auth_middleware_1.requireAuth);
/**
 * @openapi
 * /me:
 *   patch:
 *     summary: Update my profile (first/last name)
 *     tags: [Settings]
 */
exports.meRouter.patch("/", (0, validate_middleware_1.validate)(me_schema_1.updateProfileSchema), (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.updateProfile));
/**
 * @openapi
 * /me/avatar:
 *   post:
 *     summary: Upload a new avatar image (JPEG/PNG/WebP, max 2MB)
 *     tags: [Settings]
 */
exports.meRouter.post("/avatar", upload.single("avatar"), (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.uploadAvatar));
/**
 * @openapi
 * /me/preferences:
 *   get:
 *     summary: Get my notification/display preferences
 *     tags: [Settings]
 */
exports.meRouter.get("/preferences", (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.getPreferences));
/**
 * @openapi
 * /me/preferences:
 *   patch:
 *     summary: Update my notification/display preferences
 *     tags: [Settings]
 */
exports.meRouter.patch("/preferences", (0, validate_middleware_1.validate)(me_schema_1.updatePreferencesSchema), (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.updatePreferences));
/**
 * @openapi
 * /me/sessions:
 *   get:
 *     summary: List my active sessions (logged-in devices)
 *     tags: [Settings]
 */
exports.meRouter.get("/sessions", (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.listSessions));
/**
 * @openapi
 * /me/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Settings]
 */
exports.meRouter.delete("/sessions/:id", (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.revokeSession));
/**
 * @openapi
 * /me/sessions:
 *   delete:
 *     summary: Log out of every device (revoke all sessions)
 *     tags: [Settings]
 */
exports.meRouter.delete("/sessions", (0, asyncHandler_1.asyncHandler)(me_controller_1.meController.revokeAllSessions));
//# sourceMappingURL=me.routes.js.map