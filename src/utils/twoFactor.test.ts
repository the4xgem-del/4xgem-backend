import { describe, it, expect } from "vitest";
import { authenticator } from "otplib";
import {
  generateTotpSecret,
  totpOtpauthUrl,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/utils/twoFactor";

describe("TOTP", () => {
  it("generates a valid base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("verifies a token generated from the same secret", () => {
    const secret = generateTotpSecret();
    const validToken = authenticator.generate(secret);
    expect(verifyTotpToken(validToken, secret)).toBe(true);
  });

  it("rejects a token generated from a different secret", () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const tokenForB = authenticator.generate(secretB);
    expect(verifyTotpToken(tokenForB, secretA)).toBe(false);
  });

  it("rejects garbage input without throwing", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpToken("not-a-code", secret)).toBe(false);
  });

  it("builds an otpauth:// URL containing the issuer and account", () => {
    const secret = generateTotpSecret();
    const url = totpOtpauthUrl("trader@example.com", secret);
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain("4xGem");
    expect(url).toContain(encodeURIComponent("trader@example.com"));
  });
});

describe("Recovery codes", () => {
  it("generates 10 unique codes in XXXX-XXXX-XXXX format by default", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    }
  });

  it("hashes case- and whitespace-insensitively so user input variations still match", () => {
    const code = "AB12-CD34-EF56";
    expect(hashRecoveryCode(code)).toBe(hashRecoveryCode(" ab12-cd34-ef56 "));
  });

  it("produces different hashes for different codes", () => {
    const [a, b] = generateRecoveryCodes(2);
    expect(hashRecoveryCode(a)).not.toBe(hashRecoveryCode(b));
  });
});
