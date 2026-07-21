import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireAuth } from "@/middleware/auth.middleware";
import { authLimiter, sensitiveActionLimiter } from "@/middleware/rateLimit.middleware";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  verifyTotpSchema,
  disableTwoFactorSchema,
  twoFactorLoginSchema,
  googleSignInSchema,
} from "./auth.schema";

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 */
authRouter.post("/register", authLimiter, validate(registerSchema), asyncHandler(authController.register));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email + password
 *     tags: [Auth]
 */
authRouter.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate the refresh token and issue a new access token
 *     tags: [Auth]
 */
authRouter.post("/refresh", authLimiter, asyncHandler(authController.refresh));

/**
 * @openapi
 * /auth/google:
 *   post:
 *     summary: Sign in (or register/link) with a Google ID token — works for web, Android, and iOS clients
 *     tags: [Auth]
 */
authRouter.post(
  "/google",
  authLimiter,
  validate(googleSignInSchema),
  asyncHandler(authController.googleSignIn),
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current session
 *     tags: [Auth]
 */
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 */
authRouter.post(
  "/forgot-password",
  sensitiveActionLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a token from email
 *     tags: [Auth]
 */
authRouter.post(
  "/reset-password",
  sensitiveActionLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address using a token from email
 *     tags: [Auth]
 */
authRouter.post(
  "/verify-email",
  sensitiveActionLimiter,
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change password while logged in
 *     tags: [Auth]
 */
authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 */
authRouter.get("/me", requireAuth, asyncHandler(authController.me));

/**
 * @openapi
 * /auth/2fa/login-verify:
 *   post:
 *     summary: Complete login by exchanging a challenge token + TOTP/recovery code for a session
 *     tags: [Auth]
 */
authRouter.post(
  "/2fa/login-verify",
  authLimiter,
  validate(twoFactorLoginSchema),
  asyncHandler(authController.twoFactorLogin),
);

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Begin 2FA setup — returns a TOTP secret + QR code to scan
 *     tags: [Auth]
 */
authRouter.post("/2fa/setup", requireAuth, asyncHandler(authController.setupTwoFactor));

/**
 * @openapi
 * /auth/2fa/confirm:
 *   post:
 *     summary: Confirm 2FA setup with a code from the authenticator app — enables 2FA and returns recovery codes
 *     tags: [Auth]
 */
authRouter.post(
  "/2fa/confirm",
  requireAuth,
  validate(verifyTotpSchema),
  asyncHandler(authController.confirmTwoFactor),
);

/**
 * @openapi
 * /auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA (requires password confirmation)
 *     tags: [Auth]
 */
authRouter.post(
  "/2fa/disable",
  requireAuth,
  validate(disableTwoFactorSchema),
  asyncHandler(authController.disableTwoFactor),
);

/**
 * @openapi
 * /auth/2fa/recovery-codes:
 *   post:
 *     summary: Regenerate recovery codes (requires password confirmation, invalidates old codes)
 *     tags: [Auth]
 */
authRouter.post(
  "/2fa/recovery-codes",
  requireAuth,
  validate(disableTwoFactorSchema),
  asyncHandler(authController.regenerateRecoveryCodes),
);
