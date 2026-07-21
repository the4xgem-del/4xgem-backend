import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, resetPasswordSchema } from "@/modules/auth/auth.schema";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      email: "Trader@Example.com",
      password: "GoodPass123",
      firstName: "Jane",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // email should be normalized to lowercase
      expect(result.data.email).toBe("trader@example.com");
    }
  });

  it("rejects a password without an uppercase letter", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "lowercase123" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 10 characters", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ email: "not-an-email", password: "GoodPass123" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires both email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("enforces the same password strength rules as registration", () => {
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "weak" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: "abc", password: "StrongPass123" }).success).toBe(true);
  });
});
