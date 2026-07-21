import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { authService } from "./auth.service";
import { env } from "@/config/env";
import { AuthenticatedRequest } from "@/middleware/auth.middleware";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ChangePasswordInput,
  VerifyTotpInput,
  DisableTwoFactorInput,
  TwoFactorLoginInput,
  GoogleSignInInput,
} from "./auth.schema";

const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";

const cookieBase = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  domain: env.COOKIE_DOMAIN,
  path: "/",
};

function requestContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth", // refresh cookie only sent to auth routes
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, cookieBase);
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase, path: "/api/v1/auth" });
}

export const authController = {
  async register(req: Request<ParamsDictionary, unknown, RegisterInput>, res: Response) {
    const user = await authService.register(req.body, requestContext(req));
    res.status(201).json({ data: user, message: "Account created. Please check your email to verify your account." });
  },

  async login(req: Request<ParamsDictionary, unknown, LoginInput>, res: Response) {
    const result = await authService.login(req.body, requestContext(req));
    if (result.twoFactorRequired) {
      res.status(200).json({ data: { twoFactorRequired: true, challengeToken: result.challengeToken } });
      return;
    }
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({ data: { twoFactorRequired: false, ...result.user } });
  },

  async twoFactorLogin(req: Request<ParamsDictionary, unknown, TwoFactorLoginInput>, res: Response) {
    const result = await authService.completeTwoFactorLogin(req.body, requestContext(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({ data: result.user });
  },

  async googleSignIn(req: Request<ParamsDictionary, unknown, GoogleSignInInput>, res: Response) {
    const result = await authService.signInWithGoogle(req.body.idToken, requestContext(req));
    if (result.twoFactorRequired) {
      res.status(200).json({ data: { twoFactorRequired: true, challengeToken: result.challengeToken } });
      return;
    }
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({ data: { twoFactorRequired: false, ...result.user } });
  },

  async setupTwoFactor(req: AuthenticatedRequest, res: Response) {
    const result = await authService.setupTwoFactor(req.user!.id);
    res.status(200).json({ data: result });
  },

  async confirmTwoFactor(req: AuthenticatedRequest & Request<ParamsDictionary, unknown, VerifyTotpInput>, res: Response) {
    const result = await authService.confirmTwoFactor(req.user!.id, req.body.token, requestContext(req));
    res.status(200).json({ data: result });
  },

  async disableTwoFactor(req: AuthenticatedRequest & Request<ParamsDictionary, unknown, DisableTwoFactorInput>, res: Response) {
    await authService.disableTwoFactor(req.user!.id, req.body.password, requestContext(req));
    res.status(200).json({ data: { disabled: true } });
  },

  async regenerateRecoveryCodes(req: AuthenticatedRequest & Request<ParamsDictionary, unknown, DisableTwoFactorInput>, res: Response) {
    const result = await authService.regenerateRecoveryCodes(req.user!.id, req.body.password, requestContext(req));
    res.status(200).json({ data: result });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "No active session." } });
      return;
    }
    const { accessToken, refreshToken } = await authService.refresh(token, requestContext(req));
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json({ data: { refreshed: true } });
  },

async logout(req: AuthenticatedRequest, res: Response) {
  console.log("STEP 1");

  const token = req.cookies?.[REFRESH_COOKIE];
  console.log("STEP 2");

  await authService.logout(token, requestContext(req), req.user?.id);
  console.log("STEP 3");

  clearAuthCookies(res);
  console.log("STEP 4");

  res.status(200).json({
    data: { loggedOut: true },
  });

  console.log("STEP 5");
},

  async forgotPassword(req: Request<ParamsDictionary, unknown, ForgotPasswordInput>, res: Response) {
    await authService.forgotPassword(req.body, requestContext(req));
    res.status(200).json({ data: { sent: true }, message: "If that email exists, a reset link has been sent." });
  },

  async resetPassword(req: Request<ParamsDictionary, unknown, ResetPasswordInput>, res: Response) {
    await authService.resetPassword(req.body, requestContext(req));
    res.status(200).json({ data: { reset: true } });
  },

  async changePassword(req: AuthenticatedRequest & Request<ParamsDictionary, unknown, ChangePasswordInput>, res: Response) {
    await authService.changePassword(req.user!.id, req.body, requestContext(req));
    res.status(200).json({ data: { changed: true } });
  },

  async verifyEmail(req: Request<ParamsDictionary, unknown, VerifyEmailInput>, res: Response) {
    await authService.verifyEmail(req.body, requestContext(req));
    res.status(200).json({ data: { verified: true } });
  },

  async me(req: AuthenticatedRequest, res: Response) {
    const user = await authService.me(req.user!.id);
    res.status(200).json({ data: user });
  },
};
