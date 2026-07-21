"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const ApiError_1 = require("../utils/ApiError");
const logger_1 = require("../utils/logger");
function notFoundHandler(req, res) {
    res.status(404).json({
        error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found.` },
    });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError_1.ApiError) {
        if (err.statusCode >= 500)
            logger_1.logger.error({ err }, "Unhandled ApiError");
        res
            .status(err.statusCode)
            .json({ error: { code: err.code, message: err.message, details: err.details } });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "One or more fields are invalid.",
                details: err.flatten().fieldErrors,
            },
        });
        return;
    }
    if (typeof client_1.Prisma?.PrismaClientKnownRequestError === "function" &&
        err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            res
                .status(409)
                .json({ error: { code: "CONFLICT", message: "A record with these details already exists." } });
            return;
        }
        if (err.code === "P2025") {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
            return;
        }
    }
    logger_1.logger.error({
        err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
    }, "Unhandled error");
    console.error(err);
    res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map