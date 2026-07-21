"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.doubleCsrfProtection = exports.generateCsrfToken = void 0;
const csrf_csrf_1 = require("csrf-csrf");
const env_1 = require("../config/env");
/**
 * Double-submit-cookie CSRF protection. The frontend reads the token from
 * GET /api/v1/csrf-token and sends it back in the `x-csrf-token` header on
 * every mutating request; this middleware verifies it matches the cookie.
 * Only relevant for cookie-authenticated browser sessions — pure API
 * clients using Authorization: Bearer are exempt (no ambient cookie to forge).
 */
_a = (0, csrf_csrf_1.doubleCsrf)({
    getSecret: () => env_1.env.CSRF_SECRET,
    cookieName: env_1.env.COOKIE_SECURE ? "__Host-csrf" : "csrf_token",
    cookieOptions: {
        secure: env_1.env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
    },
    size: 64,
}), exports.generateCsrfToken = _a.generateToken, exports.doubleCsrfProtection = _a.doubleCsrfProtection;
//# sourceMappingURL=csrf.js.map