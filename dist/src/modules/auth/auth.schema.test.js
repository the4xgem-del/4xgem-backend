"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_schema_1 = require("../../modules/auth/auth.schema");
(0, vitest_1.describe)("registerSchema", () => {
    (0, vitest_1.it)("accepts a valid registration payload", () => {
        const result = auth_schema_1.registerSchema.safeParse({
            email: "Trader@Example.com",
            password: "GoodPass123",
            firstName: "Jane",
        });
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            // email should be normalized to lowercase
            (0, vitest_1.expect)(result.data.email).toBe("trader@example.com");
        }
    });
    (0, vitest_1.it)("rejects a password without an uppercase letter", () => {
        const result = auth_schema_1.registerSchema.safeParse({ email: "a@b.com", password: "lowercase123" });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)("rejects a password shorter than 10 characters", () => {
        const result = auth_schema_1.registerSchema.safeParse({ email: "a@b.com", password: "Ab1" });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)("rejects an invalid email", () => {
        const result = auth_schema_1.registerSchema.safeParse({ email: "not-an-email", password: "GoodPass123" });
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)("loginSchema", () => {
    (0, vitest_1.it)("requires both email and password", () => {
        (0, vitest_1.expect)(auth_schema_1.loginSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
        (0, vitest_1.expect)(auth_schema_1.loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    });
});
(0, vitest_1.describe)("resetPasswordSchema", () => {
    (0, vitest_1.it)("enforces the same password strength rules as registration", () => {
        (0, vitest_1.expect)(auth_schema_1.resetPasswordSchema.safeParse({ token: "abc", password: "weak" }).success).toBe(false);
        (0, vitest_1.expect)(auth_schema_1.resetPasswordSchema.safeParse({ token: "abc", password: "StrongPass123" }).success).toBe(true);
    });
});
//# sourceMappingURL=auth.schema.test.js.map