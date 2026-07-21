"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_schema_1 = require("../../modules/auth/auth.schema");
(0, vitest_1.describe)("verifyTotpSchema", () => {
    (0, vitest_1.it)("accepts a 6-digit code", () => {
        (0, vitest_1.expect)(auth_schema_1.verifyTotpSchema.safeParse({ token: "123456" }).success).toBe(true);
    });
    (0, vitest_1.it)("rejects a code that isn't 6 digits", () => {
        (0, vitest_1.expect)(auth_schema_1.verifyTotpSchema.safeParse({ token: "12345" }).success).toBe(false);
        (0, vitest_1.expect)(auth_schema_1.verifyTotpSchema.safeParse({ token: "abcdef" }).success).toBe(false);
    });
});
(0, vitest_1.describe)("disableTwoFactorSchema", () => {
    (0, vitest_1.it)("requires a non-empty password", () => {
        (0, vitest_1.expect)(auth_schema_1.disableTwoFactorSchema.safeParse({ password: "" }).success).toBe(false);
        (0, vitest_1.expect)(auth_schema_1.disableTwoFactorSchema.safeParse({ password: "anything" }).success).toBe(true);
    });
});
(0, vitest_1.describe)("twoFactorLoginSchema", () => {
    (0, vitest_1.it)("accepts a TOTP-length code", () => {
        (0, vitest_1.expect)(auth_schema_1.twoFactorLoginSchema.safeParse({ challengeToken: "t", code: "123456" }).success).toBe(true);
    });
    (0, vitest_1.it)("accepts a recovery-code-length code", () => {
        (0, vitest_1.expect)(auth_schema_1.twoFactorLoginSchema.safeParse({ challengeToken: "t", code: "AB12-CD34-EF56" }).success).toBe(true);
    });
    (0, vitest_1.it)("rejects a missing challenge token", () => {
        (0, vitest_1.expect)(auth_schema_1.twoFactorLoginSchema.safeParse({ code: "123456" }).success).toBe(false);
    });
});
(0, vitest_1.describe)("googleSignInSchema", () => {
    (0, vitest_1.it)("accepts a plausible-length ID token string", () => {
        (0, vitest_1.expect)(auth_schema_1.googleSignInSchema.safeParse({ idToken: "a".repeat(40) }).success).toBe(true);
    });
    (0, vitest_1.it)("rejects a too-short string (can't be a real JWT)", () => {
        (0, vitest_1.expect)(auth_schema_1.googleSignInSchema.safeParse({ idToken: "short" }).success).toBe(false);
    });
    (0, vitest_1.it)("rejects a missing idToken", () => {
        (0, vitest_1.expect)(auth_schema_1.googleSignInSchema.safeParse({}).success).toBe(false);
    });
});
//# sourceMappingURL=twoFactor.schema.test.js.map