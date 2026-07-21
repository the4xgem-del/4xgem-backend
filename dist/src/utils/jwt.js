"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.signTwoFactorChallengeToken = signTwoFactorChallengeToken;
exports.verifyTwoFactorChallengeToken = verifyTwoFactorChallengeToken;
exports.hashToken = hashToken;
exports.generateOpaqueToken = generateOpaqueToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, { expiresIn: env_1.env.JWT_ACCESS_TTL });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: `${env_1.env.JWT_REFRESH_TTL_DAYS}d`,
    });
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
}
/** Issued after password verification when 2FA is enabled; must be exchanged for a real session within 5 minutes. */
function signTwoFactorChallengeToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId, purpose: "2fa_challenge" }, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: "5m",
    });
}
function verifyTwoFactorChallengeToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    if (payload.purpose !== "2fa_challenge") {
        throw new Error("Invalid token purpose");
    }
    return payload;
}
/**
 * Refresh tokens are stored hashed (never plaintext) so a DB leak alone
 * can't be replayed as a valid session token.
 */
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function generateOpaqueToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
//# sourceMappingURL=jwt.js.map