import { describe, it, expect } from "vitest";
import { listUsersQuerySchema, updateUserSchema } from "@/modules/users/users.schema";
import { createCheckoutSessionSchema } from "@/modules/billing/billing.schema";
import { updateProgressSchema } from "@/modules/education/education.schema";

describe("listUsersQuerySchema", () => {
  it("applies defaults", () => {
    expect(listUsersQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("rejects an unknown role", () => {
    expect(listUsersQuerySchema.safeParse({ role: "SUPERUSER" }).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("allows a partial update (role only)", () => {
    expect(updateUserSchema.safeParse({ role: "EDITOR" }).success).toBe(true);
  });

  it("allows an empty object (no-op update)", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(updateUserSchema.safeParse({ status: "BANNED" }).success).toBe(false);
  });
});

describe("createCheckoutSessionSchema", () => {
  it("requires a valid UUID planId", () => {
    expect(createCheckoutSessionSchema.safeParse({ planId: "not-a-uuid" }).success).toBe(false);
    expect(createCheckoutSessionSchema.safeParse({ planId: "123e4567-e89b-12d3-a456-426614174000" }).success).toBe(true);
  });
});

describe("updateProgressSchema", () => {
  it("clamps to 0-100 and coerces strings", () => {
    expect(updateProgressSchema.parse({ progressPercent: "42" }).progressPercent).toBe(42);
    expect(updateProgressSchema.safeParse({ progressPercent: 150 }).success).toBe(false);
    expect(updateProgressSchema.safeParse({ progressPercent: -1 }).success).toBe(false);
  });
});
