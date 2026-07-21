"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const password_1 = require("../utils/password");
(0, vitest_1.describe)("password utils", () => {
    (0, vitest_1.it)("hashes a password to a non-plaintext argon2 string", async () => {
        const hash = await (0, password_1.hashPassword)("Sup3rSecret!");
        (0, vitest_1.expect)(hash).not.toBe("Sup3rSecret!");
        (0, vitest_1.expect)(hash.startsWith("$argon2id$")).toBe(true);
    });
    (0, vitest_1.it)("verifies a correct password against its hash", async () => {
        const hash = await (0, password_1.hashPassword)("Sup3rSecret!");
        await (0, vitest_1.expect)((0, password_1.verifyPassword)(hash, "Sup3rSecret!")).resolves.toBe(true);
    });
    (0, vitest_1.it)("rejects an incorrect password", async () => {
        const hash = await (0, password_1.hashPassword)("Sup3rSecret!");
        await (0, vitest_1.expect)((0, password_1.verifyPassword)(hash, "WrongPassword!")).resolves.toBe(false);
    });
    (0, vitest_1.it)("never throws on a malformed hash — returns false instead", async () => {
        await (0, vitest_1.expect)((0, password_1.verifyPassword)("not-a-real-hash", "anything")).resolves.toBe(false);
    });
});
//# sourceMappingURL=password.test.js.map