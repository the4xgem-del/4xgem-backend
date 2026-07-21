"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
    static badRequest(message, details) {
        return new ApiError(400, "BAD_REQUEST", message, details);
    }
    static unauthorized(message = "Authentication required.") {
        return new ApiError(401, "AUTH_REQUIRED", message);
    }
    static forbidden(message = "You do not have permission to perform this action.") {
        return new ApiError(403, "FORBIDDEN", message);
    }
    static notFound(message = "Resource not found.") {
        return new ApiError(404, "NOT_FOUND", message);
    }
    static conflict(message) {
        return new ApiError(409, "CONFLICT", message);
    }
    static tooMany(message = "Too many requests. Please try again later.") {
        return new ApiError(429, "RATE_LIMITED", message);
    }
    static internal(message = "Something went wrong. Please try again.") {
        return new ApiError(500, "INTERNAL_ERROR", message);
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=ApiError.js.map