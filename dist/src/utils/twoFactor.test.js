"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const otplib_1 = require("otplib");
const twoFactor_1 = require("../utils/twoFactor");
(0, vitest_1.describe)("TOTP", () => {
    (0, vitest_1.it)("generates a valid base32 secret", () => {
        const secret = (0, twoFactor_1.generateTotpSecret)();
        (0, vitest_1.expect)(secret).toMatch(/^[A-Z2-7]+$/);
        (0, vitest_1.expect)(secret.length).toBeGreaterThanOrEqual(16);
    });
    (0, vitest_1.it)("verifies a token generated from the same secret", () => {
        const secret = (0, twoFactor_1.generateTotpSecret)();
        const validToken = otplib_1.authenticator.generate(secret);
        (0, vitest_1.expect)((0, twoFactor_1.verifyTotpToken)(validToken, secret)).toBe(true);
    });
    (0, vitest_1.it)("rejects a token generated from a different secret", () => {
        const secretA = (0, twoFactor_1.generateTotpSecret)();
        const secretB = (0, twoFactor_1.generateTotpSecret)();
        const tokenForB = otplib_1.authenticator.generate(secretB);
        (0, vitest_1.expect)((0, twoFactor_1.verifyTotpToken)(tokenForB, secretA)).toBe(false);
    });
    (0, vitest_1.it)("rejects garbage input without throwing", () => {
        const secret = (0, twoFactor_1.generateTotpSecret)();
        (0, vitest_1.expect)((0, twoFactor_1.verifyTotpToken)("not-a-code", secret)).toBe(false);
    });
    (0, vitest_1.it)("builds an otpauth:// URL containing the issuer and account", () => {
        const secret = (0, twoFactor_1.generateTotpSecret)();
        const url = (0, twoFactor_1.totpOtpauthUrl)("trader@example.com", secret);
        (0, vitest_1.expect)(url).toMatch(/^otpauth:\/\/totp\//);
        (0, vitest_1.expect)(url).toContain("4xGem");
        (0, vitest_1.expect)(url).toContain(encodeURIComponent("trader@example.com"));
    });
});
(0, vitest_1.describe)("Recovery codes", () => {
    (0, vitest_1.it)("generates 10 unique codes in XXXX-XXXX-XXXX format by default", () => {
        const codes = (0, twoFactor_1.generateRecoveryCodes)();
        (0, vitest_1.expect)(codes).toHaveLength(10);
        (0, vitest_1.expect)(new Set(codes).size).toBe(10);
        for (const code of codes) {
            (0, vitest_1.expect)(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
        }
    });
    (0, vitest_1.it)("hashes case- and whitespace-insensitively so user input variations still match", () => {
        const code = "AB12-CD34-EF56";
        (0, vitest_1.expect)((0, twoFactor_1.hashRecoveryCode)(code)).toBe((0, twoFactor_1.hashRecoveryCode)(" ab12-cd34-ef56 "));
    });
    (0, vitest_1.it)("produces different hashes for different codes", () => {
        const [a, b] = (0, twoFactor_1.generateRecoveryCodes)(2);
        (0, vitest_1.expect)((0, twoFactor_1.hashRecoveryCode)(a)).not.toBe((0, twoFactor_1.hashRecoveryCode)(b));
    });
});
//# sourceMappingURL=twoFactor.test.js.map