import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "@/config/env";

export interface AccessTokenPayload {
  sub: string; // userId
  role: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // token id, matches RefreshToken.id in DB
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export interface TwoFactorChallengePayload {
  sub: string; // userId
  purpose: "2fa_challenge";
}

/** Issued after password verification when 2FA is enabled; must be exchanged for a real session within 5 minutes. */
export function signTwoFactorChallengeToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: "2fa_challenge" } satisfies TwoFactorChallengePayload, env.JWT_ACCESS_SECRET, {
    expiresIn: "5m",
  });
}

export function verifyTwoFactorChallengeToken(token: string): TwoFactorChallengePayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TwoFactorChallengePayload;
  if (payload.purpose !== "2fa_challenge") {
    throw new Error("Invalid token purpose");
  }
  return payload;
}

/**
 * Refresh tokens are stored hashed (never plaintext) so a DB leak alone
 * can't be replayed as a valid session token.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
