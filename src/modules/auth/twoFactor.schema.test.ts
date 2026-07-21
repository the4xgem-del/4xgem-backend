import { describe, it, expect } from "vitest";
import { verifyTotpSchema, disableTwoFactorSchema, twoFactorLoginSchema, googleSignInSchema } from "@/modules/auth/auth.schema";

describe("verifyTotpSchema", () => {
  it("accepts a 6-digit code", () => {
    expect(verifyTotpSchema.safeParse({ token: "123456" }).success).toBe(true);
  });

  it("rejects a code that isn't 6 digits", () => {
    expect(verifyTotpSchema.safeParse({ token: "12345" }).success).toBe(false);
    expect(verifyTotpSchema.safeParse({ token: "abcdef" }).success).toBe(false);
  });
});

describe("disableTwoFactorSchema", () => {
  it("requires a non-empty password", () => {
    expect(disableTwoFactorSchema.safeParse({ password: "" }).success).toBe(false);
    expect(disableTwoFactorSchema.safeParse({ password: "anything" }).success).toBe(true);
  });
});

describe("twoFactorLoginSchema", () => {
  it("accepts a TOTP-length code", () => {
    expect(twoFactorLoginSchema.safeParse({ challengeToken: "t", code: "123456" }).success).toBe(true);
  });

  it("accepts a recovery-code-length code", () => {
    expect(twoFactorLoginSchema.safeParse({ challengeToken: "t", code: "AB12-CD34-EF56" }).success).toBe(true);
  });

  it("rejects a missing challenge token", () => {
    expect(twoFactorLoginSchema.safeParse({ code: "123456" }).success).toBe(false);
  });
});

describe("googleSignInSchema", () => {
  it("accepts a plausible-length ID token string", () => {
    expect(googleSignInSchema.safeParse({ idToken: "a".repeat(40) }).success).toBe(true);
  });

  it("rejects a too-short string (can't be a real JWT)", () => {
    expect(googleSignInSchema.safeParse({ idToken: "short" }).success).toBe(false);
  });

  it("rejects a missing idToken", () => {
    expect(googleSignInSchema.safeParse({}).success).toBe(false);
  });
});
