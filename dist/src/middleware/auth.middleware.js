"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.optionalAuth = optionalAuth;
const jwt_1 = require("../utils/jwt");
const ApiError_1 = require("../utils/ApiError");
/**
 * Reads the access token from the httpOnly cookie (preferred) or the
 * Authorization header (for non-browser API clients), verifies it, and
 * attaches the decoded identity to `req.user`.
 */
function requireAuth(req, _res, next) {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined;
    const token = req.cookies?.access_token ?? bearer;
    if (!token) {
        return next(new ApiError_1.ApiError(401, "AUTH_REQUIRED", "Authentication required."));
    }
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
        return next();
    }
    catch {
        return next(new ApiError_1.ApiError(401, "INVALID_TOKEN", "Session expired or invalid. Please log in again."));
    }
}
/** Role-based authorization guard. Use after `requireAuth`. */
function requireRole(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new ApiError_1.ApiError(401, "AUTH_REQUIRED", "Authentication required."));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError_1.ApiError(403, "FORBIDDEN", "You do not have permission to perform this action."));
        }
        return next();
    };
}
/** Populates req.user if a valid token is present, but never blocks the request. */
function optionalAuth(req, _res, next) {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined;
    const token = req.cookies?.access_token ?? bearer;
    if (!token)
        return next();
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
    }
    catch {
        // ignore — treated as anonymous
    }
    return next();
}
//# sourceMappingURL=auth.middleware.js.map