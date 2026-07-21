"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const argon2_1 = __importDefault(require("argon2"));
/** argon2id is the OWASP-recommended variant for password hashing. */
async function hashPassword(plain) {
    return argon2_1.default.hash(plain, {
        type: argon2_1.default.argon2id,
        memoryCost: 19456, // ~19 MB, OWASP 2023 minimum
        timeCost: 2,
        parallelism: 1,
    });
}
async function verifyPassword(hash, plain) {
    if (!hash)
        return false;
    try {
        return await argon2_1.default.verify(hash, plain);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=password.js.map