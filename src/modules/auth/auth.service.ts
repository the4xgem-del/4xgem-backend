import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateOpaqueToken,
  signTwoFactorChallengeToken,
  verifyTwoFactorChallengeToken,
} from "@/utils/jwt";
import {
  generateTotpSecret,
  totpOtpauthUrl,
  totpQrCodeDataUrl,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/utils/twoFactor";
import { sendEmail, verificationEmailHtml, passwordResetEmailHtml } from "@/lib/mailer";
import { verifyGoogleIdToken } from "@/lib/googleAuth";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import { RoleName } from "@prisma/client";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ChangePasswordInput,
} from "./auth.schema";

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  twoFactorEnabled: true,
  role: { select: { name: true } },
} as const;

function toAuthTokens(user: { id: string; email: string; role: { name: string } }) {
  return signAccessToken({ sub: user.id, role: user.role.name, email: user.email });
}

async function logActivity(userId: string | null, action: string, ctx: RequestContext, metadata?: object) {
  await prisma.activityLog.create({
    data: { userId, action, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, metadata },
  });
}

async function issueRefreshToken(userId: string, ctx: RequestContext) {
  const raw = generateOpaqueToken();
  const record = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  // The refresh JWT itself just carries the DB record id (jti); the opaque
  // `raw` value is what's actually hashed & compared, so a stolen JWT alone
  // (without the raw secret) can't be replayed if the signing key ever leaks.
  const jwtToken = signRefreshToken({ sub: userId, jti: record.id });
  return { jwtToken, raw, recordId: record.id };
}

export const authService = {
  async register(input: RegisterInput, ctx: RequestContext) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict("An account with this email already exists.");
    }

    const defaultRole = await prisma.role.upsert({
      where: { name: RoleName.USER },
      update: {},
      create: { name: RoleName.USER, description: "Standard user" },
    });

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: defaultRole.id,
        preferences: { create: {} },
      },
      select: PUBLIC_USER_SELECT,
    });

    const rawToken = generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Verify your 4xGem account",
      html: verificationEmailHtml(`${env.WEB_APP_URL}/verify-email?token=${rawToken}`),
    });

    await logActivity(user.id, "auth.register", ctx);

    return user;
  },

  async login(input: LoginInput, ctx: RequestContext) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { role: true },
    });

    if (user && !user.passwordHash) {
      throw new ApiError(
        400,
        "NO_PASSWORD_SET",
        'This account signs in with Google. Use "Continue with Google", or set a password from your profile after signing in.',
      );
    }

    if (!user || !user.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
      await logActivity(user?.id ?? null, "auth.login_failed", ctx, { email: input.email });
      throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }

    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      throw new ApiError(403, "ACCOUNT_DISABLED", "This account has been disabled. Contact support.");
    }

    if (user.twoFactorEnabled) {
      await logActivity(user.id, "auth.2fa_challenge_issued", ctx);
      return { twoFactorRequired: true as const, challengeToken: signTwoFactorChallengeToken(user.id) };
    }

    return this.completeLogin(user, ctx);
  },

  /** Shared by password-only login and the post-2FA-verification login step. */
  async completeLogin(user: { id: string; email: string; role: { name: string } }, ctx: RequestContext) {
    const accessToken = toAuthTokens(user);
    const { jwtToken: refreshToken } = await issueRefreshToken(user.id, ctx);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ctx.ipAddress },
    });

    await logActivity(user.id, "auth.login", ctx);

    const fullUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: PUBLIC_USER_SELECT,
    });
    return { twoFactorRequired: false as const, user: fullUser, accessToken, refreshToken };
  },

  async completeTwoFactorLogin(input: { challengeToken: string; code: string }, ctx: RequestContext) {
    let payload;
    try {
      payload = verifyTwoFactorChallengeToken(input.challengeToken);
    } catch {
      throw new ApiError(401, "INVALID_CHALLENGE", "This login attempt has expired. Please sign in again.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ApiError(401, "INVALID_CHALLENGE", "This login attempt has expired. Please sign in again.");
    }

    const isTotpValid = /^\d{6}$/.test(input.code) && verifyTotpToken(input.code, user.twoFactorSecret);
    const isRecoveryValid = !isTotpValid && (await this.tryConsumeRecoveryCode(user.id, input.code));

    if (!isTotpValid && !isRecoveryValid) {
      await logActivity(user.id, "auth.2fa_failed", ctx);
      throw new ApiError(401, "INVALID_2FA_CODE", "That code isn't valid. Please try again.");
    }

    return this.completeLogin(user, ctx);
  },

  async tryConsumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const codeHash = hashRecoveryCode(code);
    const record = await prisma.twoFactorRecoveryCode.findUnique({ where: { codeHash } });
    if (!record || record.userId !== userId || record.usedAt) return false;
    await prisma.twoFactorRecoveryCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return true;
  },

  /**
   * Google Sign-In. Verifies the ID token (works identically whether it
   * came from the web GIS client, or a native Android/iOS Google Sign-In
   * SDK — see lib/googleAuth.ts), then:
   *   1. If a user is already linked to this Google account → log them in.
   *   2. Else if an existing account has this email (registered normally,
   *      or via a different sign-in method) → link this Google account to
   *      it (by email match) and log them in. Google has already verified
   *      the email, so this is a safe automatic link, not a security gap.
   *   3. Else → create a brand new account, email pre-verified (Google
   *      already did that), default USER role, no password set.
   * Every path funnels through the same completeLogin()/2FA-challenge
   * logic as password login, so refresh tokens, RBAC, and 2FA are all
   * identical regardless of which sign-in method was used.
   */
  async signInWithGoogle(idToken: string, ctx: RequestContext) {
    const identity = await verifyGoogleIdToken(idToken);

    let user = await prisma.user.findUnique({
      where: { googleId: identity.googleId },
      include: { role: true },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: identity.email },
        include: { role: true },
      });

      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: identity.googleId,
            emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
            status: existingByEmail.status === "PENDING_VERIFICATION" ? "ACTIVE" : existingByEmail.status,
            avatarUrl: existingByEmail.avatarUrl ?? identity.avatarUrl,
          },
          include: { role: true },
        });
        await logActivity(user.id, "auth.google_linked", ctx);
      } else {
        const defaultRole = await prisma.role.upsert({
          where: { name: RoleName.USER },
          update: {},
          create: { name: RoleName.USER, description: "Standard user" },
        });

        user = await prisma.user.create({
          data: {
            email: identity.email,
            googleId: identity.googleId,
            passwordHash: null,
            firstName: identity.firstName,
            lastName: identity.lastName,
            avatarUrl: identity.avatarUrl,
            status: "ACTIVE",
            emailVerifiedAt: new Date(),
            roleId: defaultRole.id,
            preferences: { create: {} },
          },
          include: { role: true },
        });
        await logActivity(user.id, "auth.google_signup", ctx);
      }
    }

    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      throw new ApiError(403, "ACCOUNT_DISABLED", "This account has been disabled. Contact support.");
    }

    if (user.twoFactorEnabled) {
      await logActivity(user.id, "auth.2fa_challenge_issued", ctx);
      return { twoFactorRequired: true as const, challengeToken: signTwoFactorChallengeToken(user.id) };
    }

    return this.completeLogin(user, ctx);
  },

  // ── Two-factor setup / management ──────────────────────────────────────

  async setupTwoFactor(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw ApiError.badRequest("Two-factor authentication is already enabled.");
    }

    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const otpauthUrl = totpOtpauthUrl(user.email, secret);
    const qrCodeDataUrl = await totpQrCodeDataUrl(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  },

  async confirmTwoFactor(userId: string, token: string, ctx: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) {
      throw ApiError.badRequest("Start setup first by requesting a QR code.");
    }
    if (!verifyTotpToken(token, user.twoFactorSecret)) {
      throw ApiError.badRequest("That code isn't valid. Please check your authenticator app and try again.");
    }

    const recoveryCodes = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
      prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      prisma.twoFactorRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })),
      }),
    ]);

    await logActivity(userId, "auth.2fa_enabled", ctx);
    return { recoveryCodes };
  },

  async disableTwoFactor(userId: string, password: string, ctx: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw ApiError.badRequest(
        "Set a password from your profile first — this account currently only signs in with Google.",
      );
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw ApiError.badRequest("Incorrect password.");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } }),
      prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    ]);

    await logActivity(userId, "auth.2fa_disabled", ctx);
  },

  async regenerateRecoveryCodes(userId: string, password: string, ctx: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorEnabled) {
      throw ApiError.badRequest("Two-factor authentication isn't enabled.");
    }
    if (!user.passwordHash) {
      throw ApiError.badRequest(
        "Set a password from your profile first — this account currently only signs in with Google.",
      );
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw ApiError.badRequest("Incorrect password.");
    }

    const recoveryCodes = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      prisma.twoFactorRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })),
      }),
    ]);

    await logActivity(userId, "auth.2fa_recovery_codes_regenerated", ctx);
    return { recoveryCodes };
  },

  async refresh(refreshTokenJwt: string, ctx: RequestContext) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenJwt);
    } catch {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Session expired. Please log in again.");
    }

    const record = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Session expired. Please log in again.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user) throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Session expired. Please log in again.");

    // Rotate: revoke old refresh token, issue a new one (mitigates replay).
    const { jwtToken: newRefreshToken, recordId } = await issueRefreshToken(user.id, ctx);
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: recordId },
    });

    const accessToken = toAuthTokens(user);
    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshTokenJwt: string | undefined, ctx: RequestContext, userId?: string) {
    if (refreshTokenJwt) {
      try {
        const payload = verifyRefreshToken(refreshTokenJwt);
        await prisma.refreshToken.updateMany({
          where: { id: payload.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // token already invalid — nothing to revoke
      }
    }
    if (userId) {
      try {
        await logActivity(userId, "auth.logout", ctx);
      } catch (e) {
        console.error("Activity log failed:", e);
      }
    }
  },

  async forgotPassword(input: ForgotPasswordInput, ctx: RequestContext) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Always return success shape regardless of whether the user exists —
    // prevents attackers from using this endpoint to enumerate registered emails.
    if (!user) return;

    const rawToken = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Reset your 4xGem password",
      html: passwordResetEmailHtml(`${env.WEB_APP_URL}/reset-password?token=${rawToken}`),
    });

    await logActivity(user.id, "auth.forgot_password_requested", ctx);
  },

  async resetPassword(input: ResetPasswordInput, ctx: RequestContext) {
    const tokenHash = hashToken(input.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw ApiError.badRequest("This reset link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Reset implies "I might be compromised" — revoke all existing sessions.
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await logActivity(record.userId, "auth.password_reset", ctx);
  },

  async changePassword(userId: string, input: ChangePasswordInput, ctx: RequestContext) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw ApiError.badRequest("Current password is incorrect.");
    }
    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await logActivity(userId, "auth.password_changed", ctx);
  },

  async verifyEmail(input: VerifyEmailInput, ctx: RequestContext) {
    const tokenHash = hashToken(input.token);
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw ApiError.badRequest("This verification link is invalid or has expired.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date(), status: "ACTIVE" },
      }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    await logActivity(record.userId, "auth.email_verified", ctx);
  },

  async me(userId: string) {
    return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: PUBLIC_USER_SELECT });
  },
};
