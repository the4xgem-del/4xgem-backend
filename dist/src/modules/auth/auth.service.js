"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const prisma_1 = require("../../lib/prisma");
const password_1 = require("../../utils/password");
const jwt_1 = require("../../utils/jwt");
const twoFactor_1 = require("../../utils/twoFactor");
const mailer_1 = require("../../lib/mailer");
const googleAuth_1 = require("../../lib/googleAuth");
const env_1 = require("../../config/env");
const ApiError_1 = require("../../utils/ApiError");
const client_1 = require("@prisma/client");
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
};
function toAuthTokens(user) {
    return (0, jwt_1.signAccessToken)({ sub: user.id, role: user.role.name, email: user.email });
}
async function logActivity(userId, action, ctx, metadata) {
    await prisma_1.prisma.activityLog.create({
        data: { userId, action, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, metadata },
    });
}
async function issueRefreshToken(userId, ctx) {
    const raw = (0, jwt_1.generateOpaqueToken)();
    const record = await prisma_1.prisma.refreshToken.create({
        data: {
            userId,
            tokenHash: (0, jwt_1.hashToken)(raw),
            userAgent: ctx.userAgent,
            ipAddress: ctx.ipAddress,
            expiresAt: new Date(Date.now() + env_1.env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
    });
    // The refresh JWT itself just carries the DB record id (jti); the opaque
    // `raw` value is what's actually hashed & compared, so a stolen JWT alone
    // (without the raw secret) can't be replayed if the signing key ever leaks.
    const jwtToken = (0, jwt_1.signRefreshToken)({ sub: userId, jti: record.id });
    return { jwtToken, raw, recordId: record.id };
}
exports.authService = {
    async register(input, ctx) {
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        if (existing) {
            throw ApiError_1.ApiError.conflict("An account with this email already exists.");
        }
        const defaultRole = await prisma_1.prisma.role.upsert({
            where: { name: client_1.RoleName.USER },
            update: {},
            create: { name: client_1.RoleName.USER, description: "Standard user" },
        });
        const passwordHash = await (0, password_1.hashPassword)(input.password);
        const user = await prisma_1.prisma.user.create({
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
        const rawToken = (0, jwt_1.generateOpaqueToken)();
        await prisma_1.prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                tokenHash: (0, jwt_1.hashToken)(rawToken),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        await (0, mailer_1.sendEmail)({
            to: user.email,
            subject: "Verify your 4xGem account",
            html: (0, mailer_1.verificationEmailHtml)(`${env_1.env.WEB_APP_URL}/verify-email?token=${rawToken}`),
        });
        await logActivity(user.id, "auth.register", ctx);
        return user;
    },
    async login(input, ctx) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: input.email },
            include: { role: true },
        });
        if (user && !user.passwordHash) {
            throw new ApiError_1.ApiError(400, "NO_PASSWORD_SET", 'This account signs in with Google. Use "Continue with Google", or set a password from your profile after signing in.');
        }
        if (!user || !user.passwordHash || !(await (0, password_1.verifyPassword)(user.passwordHash, input.password))) {
            await logActivity(user?.id ?? null, "auth.login_failed", ctx, { email: input.email });
            throw new ApiError_1.ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
        }
        if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
            throw new ApiError_1.ApiError(403, "ACCOUNT_DISABLED", "This account has been disabled. Contact support.");
        }
        if (user.twoFactorEnabled) {
            await logActivity(user.id, "auth.2fa_challenge_issued", ctx);
            return { twoFactorRequired: true, challengeToken: (0, jwt_1.signTwoFactorChallengeToken)(user.id) };
        }
        return this.completeLogin(user, ctx);
    },
    /** Shared by password-only login and the post-2FA-verification login step. */
    async completeLogin(user, ctx) {
        const accessToken = toAuthTokens(user);
        const { jwtToken: refreshToken } = await issueRefreshToken(user.id, ctx);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), lastLoginIp: ctx.ipAddress },
        });
        await logActivity(user.id, "auth.login", ctx);
        const fullUser = await prisma_1.prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: PUBLIC_USER_SELECT,
        });
        return { twoFactorRequired: false, user: fullUser, accessToken, refreshToken };
    },
    async completeTwoFactorLogin(input, ctx) {
        let payload;
        try {
            payload = (0, jwt_1.verifyTwoFactorChallengeToken)(input.challengeToken);
        }
        catch {
            throw new ApiError_1.ApiError(401, "INVALID_CHALLENGE", "This login attempt has expired. Please sign in again.");
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new ApiError_1.ApiError(401, "INVALID_CHALLENGE", "This login attempt has expired. Please sign in again.");
        }
        const isTotpValid = /^\d{6}$/.test(input.code) && (0, twoFactor_1.verifyTotpToken)(input.code, user.twoFactorSecret);
        const isRecoveryValid = !isTotpValid && (await this.tryConsumeRecoveryCode(user.id, input.code));
        if (!isTotpValid && !isRecoveryValid) {
            await logActivity(user.id, "auth.2fa_failed", ctx);
            throw new ApiError_1.ApiError(401, "INVALID_2FA_CODE", "That code isn't valid. Please try again.");
        }
        return this.completeLogin(user, ctx);
    },
    async tryConsumeRecoveryCode(userId, code) {
        const codeHash = (0, twoFactor_1.hashRecoveryCode)(code);
        const record = await prisma_1.prisma.twoFactorRecoveryCode.findUnique({ where: { codeHash } });
        if (!record || record.userId !== userId || record.usedAt)
            return false;
        await prisma_1.prisma.twoFactorRecoveryCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
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
    async signInWithGoogle(idToken, ctx) {
        const identity = await (0, googleAuth_1.verifyGoogleIdToken)(idToken);
        let user = await prisma_1.prisma.user.findUnique({
            where: { googleId: identity.googleId },
            include: { role: true },
        });
        if (!user) {
            const existingByEmail = await prisma_1.prisma.user.findUnique({
                where: { email: identity.email },
                include: { role: true },
            });
            if (existingByEmail) {
                user = await prisma_1.prisma.user.update({
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
            }
            else {
                const defaultRole = await prisma_1.prisma.role.upsert({
                    where: { name: client_1.RoleName.USER },
                    update: {},
                    create: { name: client_1.RoleName.USER, description: "Standard user" },
                });
                user = await prisma_1.prisma.user.create({
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
            throw new ApiError_1.ApiError(403, "ACCOUNT_DISABLED", "This account has been disabled. Contact support.");
        }
        if (user.twoFactorEnabled) {
            await logActivity(user.id, "auth.2fa_challenge_issued", ctx);
            return { twoFactorRequired: true, challengeToken: (0, jwt_1.signTwoFactorChallengeToken)(user.id) };
        }
        return this.completeLogin(user, ctx);
    },
    // ── Two-factor setup / management ──────────────────────────────────────
    async setupTwoFactor(userId) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.twoFactorEnabled) {
            throw ApiError_1.ApiError.badRequest("Two-factor authentication is already enabled.");
        }
        const secret = (0, twoFactor_1.generateTotpSecret)();
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
        const otpauthUrl = (0, twoFactor_1.totpOtpauthUrl)(user.email, secret);
        const qrCodeDataUrl = await (0, twoFactor_1.totpQrCodeDataUrl)(otpauthUrl);
        return { secret, otpauthUrl, qrCodeDataUrl };
    },
    async confirmTwoFactor(userId, token, ctx) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.twoFactorSecret) {
            throw ApiError_1.ApiError.badRequest("Start setup first by requesting a QR code.");
        }
        if (!(0, twoFactor_1.verifyTotpToken)(token, user.twoFactorSecret)) {
            throw ApiError_1.ApiError.badRequest("That code isn't valid. Please check your authenticator app and try again.");
        }
        const recoveryCodes = (0, twoFactor_1.generateRecoveryCodes)();
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
            prisma_1.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
            prisma_1.prisma.twoFactorRecoveryCode.createMany({
                data: recoveryCodes.map((code) => ({ userId, codeHash: (0, twoFactor_1.hashRecoveryCode)(code) })),
            }),
        ]);
        await logActivity(userId, "auth.2fa_enabled", ctx);
        return { recoveryCodes };
    },
    async disableTwoFactor(userId, password, ctx) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.passwordHash) {
            throw ApiError_1.ApiError.badRequest("Set a password from your profile first — this account currently only signs in with Google.");
        }
        if (!(await (0, password_1.verifyPassword)(user.passwordHash, password))) {
            throw ApiError_1.ApiError.badRequest("Incorrect password.");
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } }),
            prisma_1.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
        ]);
        await logActivity(userId, "auth.2fa_disabled", ctx);
    },
    async regenerateRecoveryCodes(userId, password, ctx) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!user.twoFactorEnabled) {
            throw ApiError_1.ApiError.badRequest("Two-factor authentication isn't enabled.");
        }
        if (!user.passwordHash) {
            throw ApiError_1.ApiError.badRequest("Set a password from your profile first — this account currently only signs in with Google.");
        }
        if (!(await (0, password_1.verifyPassword)(user.passwordHash, password))) {
            throw ApiError_1.ApiError.badRequest("Incorrect password.");
        }
        const recoveryCodes = (0, twoFactor_1.generateRecoveryCodes)();
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
            prisma_1.prisma.twoFactorRecoveryCode.createMany({
                data: recoveryCodes.map((code) => ({ userId, codeHash: (0, twoFactor_1.hashRecoveryCode)(code) })),
            }),
        ]);
        await logActivity(userId, "auth.2fa_recovery_codes_regenerated", ctx);
        return { recoveryCodes };
    },
    async refresh(refreshTokenJwt, ctx) {
        let payload;
        try {
            payload = (0, jwt_1.verifyRefreshToken)(refreshTokenJwt);
        }
        catch {
            throw new ApiError_1.ApiError(401, "INVALID_REFRESH_TOKEN", "Session expired. Please log in again.");
        }
        const record = await prisma_1.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
        if (!record || record.revokedAt || record.expiresAt < new Date()) {
            throw new ApiError_1.ApiError(401, "INVALID_REFRESH_TOKEN", "Session expired. Please log in again.");
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
        if (!user)
            throw new ApiError_1.ApiError(401, "INVALID_REFRESH_TOKEN", "Session expired. Please log in again.");
        // Rotate: revoke old refresh token, issue a new one (mitigates replay).
        const { jwtToken: newRefreshToken, recordId } = await issueRefreshToken(user.id, ctx);
        await prisma_1.prisma.refreshToken.update({
            where: { id: record.id },
            data: { revokedAt: new Date(), replacedBy: recordId },
        });
        const accessToken = toAuthTokens(user);
        return { accessToken, refreshToken: newRefreshToken };
    },
    async logout(refreshTokenJwt, ctx, userId) {
        if (refreshTokenJwt) {
            try {
                const payload = (0, jwt_1.verifyRefreshToken)(refreshTokenJwt);
                await prisma_1.prisma.refreshToken.updateMany({
                    where: { id: payload.jti, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
            }
            catch {
                // token already invalid — nothing to revoke
            }
        }
        if (userId) {
            try {
                await logActivity(userId, "auth.logout", ctx);
            }
            catch (e) {
                console.error("Activity log failed:", e);
            }
        }
    },
    async forgotPassword(input, ctx) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        // Always return success shape regardless of whether the user exists —
        // prevents attackers from using this endpoint to enumerate registered emails.
        if (!user)
            return;
        const rawToken = (0, jwt_1.generateOpaqueToken)();
        await prisma_1.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: (0, jwt_1.hashToken)(rawToken),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
        });
        await (0, mailer_1.sendEmail)({
            to: user.email,
            subject: "Reset your 4xGem password",
            html: (0, mailer_1.passwordResetEmailHtml)(`${env_1.env.WEB_APP_URL}/reset-password?token=${rawToken}`),
        });
        await logActivity(user.id, "auth.forgot_password_requested", ctx);
    },
    async resetPassword(input, ctx) {
        const tokenHash = (0, jwt_1.hashToken)(input.token);
        const record = await prisma_1.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw ApiError_1.ApiError.badRequest("This reset link is invalid or has expired.");
        }
        const passwordHash = await (0, password_1.hashPassword)(input.password);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
            prisma_1.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
            // Reset implies "I might be compromised" — revoke all existing sessions.
            prisma_1.prisma.refreshToken.updateMany({
                where: { userId: record.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await logActivity(record.userId, "auth.password_reset", ctx);
    },
    async changePassword(userId, input, ctx) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (!(await (0, password_1.verifyPassword)(user.passwordHash, input.currentPassword))) {
            throw ApiError_1.ApiError.badRequest("Current password is incorrect.");
        }
        const passwordHash = await (0, password_1.hashPassword)(input.newPassword);
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
        await logActivity(userId, "auth.password_changed", ctx);
    },
    async verifyEmail(input, ctx) {
        const tokenHash = (0, jwt_1.hashToken)(input.token);
        const record = await prisma_1.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw ApiError_1.ApiError.badRequest("This verification link is invalid or has expired.");
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: record.userId },
                data: { emailVerifiedAt: new Date(), status: "ACTIVE" },
            }),
            prisma_1.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        ]);
        await logActivity(record.userId, "auth.email_verified", ctx);
    },
    async me(userId) {
        return prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: PUBLIC_USER_SELECT });
    },
};
//# sourceMappingURL=auth.service.js.map