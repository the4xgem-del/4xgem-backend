"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../../middleware/rateLimit.middleware");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_schema_1 = require("./auth.schema");
exports.authRouter = (0, express_1.Router)();
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 */
exports.authRouter.post("/register", rateLimit_middleware_1.authLimiter, (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.register));
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email + password
 *     tags: [Auth]
 */
exports.authRouter.post("/login", rateLimit_middleware_1.authLimiter, (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.login));
/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate the refresh token and issue a new access token
 *     tags: [Auth]
 */
exports.authRouter.post("/refresh", rateLimit_middleware_1.authLimiter, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.refresh));
/**
 * @openapi
 * /auth/google:
 *   post:
 *     summary: Sign in (or register/link) with a Google ID token — works for web, Android, and iOS clients
 *     tags: [Auth]
 */
exports.authRouter.post("/google", rateLimit_middleware_1.authLimiter, (0, validate_middleware_1.validate)(auth_schema_1.googleSignInSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.googleSignIn));
/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current session
 *     tags: [Auth]
 */
exports.authRouter.post("/logout", auth_middleware_1.requireAuth, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.logout));
/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 */
exports.authRouter.post("/forgot-password", rateLimit_middleware_1.sensitiveActionLimiter, (0, validate_middleware_1.validate)(auth_schema_1.forgotPasswordSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.forgotPassword));
/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a token from email
 *     tags: [Auth]
 */
exports.authRouter.post("/reset-password", rateLimit_middleware_1.sensitiveActionLimiter, (0, validate_middleware_1.validate)(auth_schema_1.resetPasswordSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.resetPassword));
/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address using a token from email
 *     tags: [Auth]
 */
exports.authRouter.post("/verify-email", rateLimit_middleware_1.sensitiveActionLimiter, (0, validate_middleware_1.validate)(auth_schema_1.verifyEmailSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.verifyEmail));
/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change password while logged in
 *     tags: [Auth]
 */
exports.authRouter.post("/change-password", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(auth_schema_1.changePasswordSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.changePassword));
/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 */
exports.authRouter.get("/me", auth_middleware_1.requireAuth, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.me));
/**
 * @openapi
 * /auth/2fa/login-verify:
 *   post:
 *     summary: Complete login by exchanging a challenge token + TOTP/recovery code for a session
 *     tags: [Auth]
 */
exports.authRouter.post("/2fa/login-verify", rateLimit_middleware_1.authLimiter, (0, validate_middleware_1.validate)(auth_schema_1.twoFactorLoginSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.twoFactorLogin));
/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Begin 2FA setup — returns a TOTP secret + QR code to scan
 *     tags: [Auth]
 */
exports.authRouter.post("/2fa/setup", auth_middleware_1.requireAuth, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.setupTwoFactor));
/**
 * @openapi
 * /auth/2fa/confirm:
 *   post:
 *     summary: Confirm 2FA setup with a code from the authenticator app — enables 2FA and returns recovery codes
 *     tags: [Auth]
 */
exports.authRouter.post("/2fa/confirm", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(auth_schema_1.verifyTotpSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.confirmTwoFactor));
/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA (requires password confirmation)
 *     tags: [Auth]
 */
exports.authRouter.post("/2fa/disable", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(auth_schema_1.disableTwoFactorSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.disableTwoFactor));
/**
 * @openapi
 * /auth/2fa/recovery-codes:
 *   post:
 *     summary: Regenerate recovery codes (requires password confirmation, invalidates old codes)
 *     tags: [Auth]
 */
exports.authRouter.post("/2fa/recovery-codes", auth_middleware_1.requireAuth, (0, validate_middleware_1.validate)(auth_schema_1.disableTwoFactorSchema), (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.regenerateRecoveryCodes));
//# sourceMappingURL=auth.routes.js.map