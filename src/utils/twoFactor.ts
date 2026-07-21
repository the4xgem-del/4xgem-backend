import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import { hashToken } from "@/utils/jwt";

const ISSUER = "4xGem";

authenticator.options = { window: 1 }; // allow 1 step (±30s) of clock drift

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpOtpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export async function totpQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/** Generates human-friendly recovery codes (e.g. "XXXX-XXXX-XXXX"), returned once, stored only hashed. */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase(); // 12 hex chars
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  // Recovery codes are single-use, high-entropy (48 bits) tokens compared
  // by exact hash match — the same threat model as refresh tokens, so the
  // same fast SHA-256 comparison (rather than a slow password hash) is
  // appropriate and keeps login-time verification cheap.
  return hashToken(code.toUpperCase().trim());
}
