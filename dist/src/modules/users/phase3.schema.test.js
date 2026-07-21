"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const users_schema_1 = require("../../modules/users/users.schema");
const billing_schema_1 = require("../../modules/billing/billing.schema");
const education_schema_1 = require("../../modules/education/education.schema");
(0, vitest_1.describe)("listUsersQuerySchema", () => {
    (0, vitest_1.it)("applies defaults", () => {
        (0, vitest_1.expect)(users_schema_1.listUsersQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    });
    (0, vitest_1.it)("rejects an unknown role", () => {
        (0, vitest_1.expect)(users_schema_1.listUsersQuerySchema.safeParse({ role: "SUPERUSER" }).success).toBe(false);
    });
});
(0, vitest_1.describe)("updateUserSchema", () => {
    (0, vitest_1.it)("allows a partial update (role only)", () => {
        (0, vitest_1.expect)(users_schema_1.updateUserSchema.safeParse({ role: "EDITOR" }).success).toBe(true);
    });
    (0, vitest_1.it)("allows an empty object (no-op update)", () => {
        (0, vitest_1.expect)(users_schema_1.updateUserSchema.safeParse({}).success).toBe(true);
    });
    (0, vitest_1.it)("rejects an invalid status", () => {
        (0, vitest_1.expect)(users_schema_1.updateUserSchema.safeParse({ status: "BANNED" }).success).toBe(false);
    });
});
(0, vitest_1.describe)("createCheckoutSessionSchema", () => {
    (0, vitest_1.it)("requires a valid UUID planId", () => {
        (0, vitest_1.expect)(billing_schema_1.createCheckoutSessionSchema.safeParse({ planId: "not-a-uuid" }).success).toBe(false);
        (0, vitest_1.expect)(billing_schema_1.createCheckoutSessionSchema.safeParse({ planId: "123e4567-e89b-12d3-a456-426614174000" }).success).toBe(true);
    });
});
(0, vitest_1.describe)("updateProgressSchema", () => {
    (0, vitest_1.it)("clamps to 0-100 and coerces strings", () => {
        (0, vitest_1.expect)(education_schema_1.updateProgressSchema.parse({ progressPercent: "42" }).progressPercent).toBe(42);
        (0, vitest_1.expect)(education_schema_1.updateProgressSchema.safeParse({ progressPercent: 150 }).success).toBe(false);
        (0, vitest_1.expect)(education_schema_1.updateProgressSchema.safeParse({ progressPercent: -1 }).success).toBe(false);
    });
});
//# sourceMappingURL=phase3.schema.test.js.map