"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
/**
 * Wraps an async Express handler so a rejected promise is forwarded to
 * `next()` (and therefore the error middleware) instead of crashing the
 * process or hanging the request. Generic so handlers typed against
 * `AuthenticatedRequest` (or other Request subtypes) are still accepted.
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
//# sourceMappingURL=asyncHandler.js.map