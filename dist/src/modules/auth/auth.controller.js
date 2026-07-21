"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
const env_1 = require("../../config/env");
const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";
const cookieBase = {
    httpOnly: true,
    secure: env_1.env.COOKIE_SECURE,
    sameSite: "lax",
    domain: env_1.env.COOKIE_DOMAIN,
    path: "/",
};
function requestContext(req) {
    return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie(ACCESS_COOKIE, accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...cookieBase,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/api/v1/auth", // refresh cookie only sent to auth routes
    });
}
function clearAuthCookies(res) {
    res.clearCookie(ACCESS_COOKIE, cookieBase);
    res.clearCookie(REFRESH_COOKIE, { ...cookieBase, path: "/api/v1/auth" });
}
exports.authController = {
    async register(req, res) {
        const user = await auth_service_1.authService.register(req.body, requestContext(req));
        res.status(201).json({ data: user, message: "Account created. Please check your email to verify your account." });
    },
    async login(req, res) {
        const result = await auth_service_1.authService.login(req.body, requestContext(req));
        if (result.twoFactorRequired) {
            res.status(200).json({ data: { twoFactorRequired: true, challengeToken: result.challengeToken } });
            return;
        }
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({ data: { twoFactorRequired: false, ...result.user } });
    },
    async twoFactorLogin(req, res) {
        const result = await auth_service_1.authService.completeTwoFactorLogin(req.body, requestContext(req));
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({ data: result.user });
    },
    async googleSignIn(req, res) {
        const result = await auth_service_1.authService.signInWithGoogle(req.body.idToken, requestContext(req));
        if (result.twoFactorRequired) {
            res.status(200).json({ data: { twoFactorRequired: true, challengeToken: result.challengeToken } });
            return;
        }
        setAuthCookies(res, result.accessToken, result.refreshToken);
        res.status(200).json({ data: { twoFactorRequired: false, ...result.user } });
    },
    async setupTwoFactor(req, res) {
        const result = await auth_service_1.authService.setupTwoFactor(req.user.id);
        res.status(200).json({ data: result });
    },
    async confirmTwoFactor(req, res) {
        const result = await auth_service_1.authService.confirmTwoFactor(req.user.id, req.body.token, requestContext(req));
        res.status(200).json({ data: result });
    },
    async disableTwoFactor(req, res) {
        await auth_service_1.authService.disableTwoFactor(req.user.id, req.body.password, requestContext(req));
        res.status(200).json({ data: { disabled: true } });
    },
    async regenerateRecoveryCodes(req, res) {
        const result = await auth_service_1.authService.regenerateRecoveryCodes(req.user.id, req.body.password, requestContext(req));
        res.status(200).json({ data: result });
    },
    async refresh(req, res) {
        const token = req.cookies?.[REFRESH_COOKIE];
        if (!token) {
            res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "No active session." } });
            return;
        }
        const { accessToken, refreshToken } = await auth_service_1.authService.refresh(token, requestContext(req));
        setAuthCookies(res, accessToken, refreshToken);
        res.status(200).json({ data: { refreshed: true } });
    },
    async logout(req, res) {
        const token = req.cookies?.[REFRESH_COOKIE];
        await auth_service_1.authService.logout(token, requestContext(req), req.user?.id);
        clearAuthCookies(res);
        res.status(200).json({ data: { loggedOut: true } });
    },
    async forgotPassword(req, res) {
        await auth_service_1.authService.forgotPassword(req.body, requestContext(req));
        res.status(200).json({ data: { sent: true }, message: "If that email exists, a reset link has been sent." });
    },
    async resetPassword(req, res) {
        await auth_service_1.authService.resetPassword(req.body, requestContext(req));
        res.status(200).json({ data: { reset: true } });
    },
    async changePassword(req, res) {
        await auth_service_1.authService.changePassword(req.user.id, req.body, requestContext(req));
        res.status(200).json({ data: { changed: true } });
    },
    async verifyEmail(req, res) {
        await auth_service_1.authService.verifyEmail(req.body, requestContext(req));
        res.status(200).json({ data: { verified: true } });
    },
    async me(req, res) {
        const user = await auth_service_1.authService.me(req.user.id);
        res.status(200).json({ data: user });
    },
};
//# sourceMappingURL=auth.controller.js.map