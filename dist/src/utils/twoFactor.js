"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotpSecret = generateTotpSecret;
exports.totpOtpauthUrl = totpOtpauthUrl;
exports.totpQrCodeDataUrl = totpQrCodeDataUrl;
exports.verifyTotpToken = verifyTotpToken;
exports.generateRecoveryCodes = generateRecoveryCodes;
exports.hashRecoveryCode = hashRecoveryCode;
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const jwt_1 = require("../utils/jwt");
const ISSUER = "4xGem";
otplib_1.authenticator.options = { window: 1 }; // allow 1 step (±30s) of clock drift
function generateTotpSecret() {
    return otplib_1.authenticator.generateSecret();
}
function totpOtpauthUrl(email, secret) {
    return otplib_1.authenticator.keyuri(email, ISSUER, secret);
}
async function totpQrCodeDataUrl(otpauthUrl) {
    return qrcode_1.default.toDataURL(otpauthUrl);
}
function verifyTotpToken(token, secret) {
    try {
        return otplib_1.authenticator.verify({ token, secret });
    }
    catch {
        return false;
    }
}
/** Generates human-friendly recovery codes (e.g. "XXXX-XXXX-XXXX"), returned once, stored only hashed. */
function generateRecoveryCodes(count = 10) {
    return Array.from({ length: count }, () => {
        const raw = crypto_1.default.randomBytes(6).toString("hex").toUpperCase(); // 12 hex chars
        return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    });
}
function hashRecoveryCode(code) {
    // Recovery codes are single-use, high-entropy (48 bits) tokens compared
    // by exact hash match — the same threat model as refresh tokens, so the
    // same fast SHA-256 comparison (rather than a slow password hash) is
    // appropriate and keeps login-time verification cheap.
    return (0, jwt_1.hashToken)(code.toUpperCase().trim());
}
//# sourceMappingURL=twoFactor.js.map