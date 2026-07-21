"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const pino_http_1 = __importDefault(require("pino-http"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const routes_1 = require("./routes");
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const csrf_1 = require("./config/csrf");
const swagger_1 = require("./config/swagger");
function createApp() {
    const app = (0, express_1.default)();
    app.set("trust proxy", 1); // required for correct req.ip / rate limiting behind Nginx/ELB
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind's runtime injects inline styles
                imgSrc: ["'self'", "data:", "https:"], // avatar/S3 images can come from any https host
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                ...(env_1.isProd ? { upgradeInsecureRequests: [] } : {}),
            },
        },
        hsts: env_1.isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
        crossOriginResourcePolicy: { policy: "cross-origin" }, // API is consumed by a separate frontend origin
    }));
    app.use((0, cors_1.default)({
        origin: env_1.env.WEB_APP_URL,
        credentials: true,
    }));
    app.use((0, compression_1.default)());
    app.use((0, cookie_parser_1.default)());
    // Stripe requires the exact raw request bytes to verify its signature, so
    // this must be parsed as a raw Buffer BEFORE the global JSON parser below
    // (which will safely skip re-parsing this same request afterwards).
    app.use("/api/v1/billing/webhook", express_1.default.raw({ type: "application/json" }));
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "1mb" }));
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.use("/api", rateLimit_middleware_1.apiLimiter);
    // CSRF token issuance — frontend calls this once on load, then attaches
    // the token to every mutating request via the x-csrf-token header.
    app.get("/api/v1/csrf-token", (req, res) => {
        res.json({ data: { csrfToken: (0, csrf_1.generateCsrfToken)(req, res) } });
    });
    // Enforce CSRF on cookie-authenticated mutating requests, except auth
    // endpoints that establish the session in the first place and webhook
    // endpoints authenticated by signature instead of cookies.
    app.use((req, res, next) => {
        const exempt = req.path.startsWith("/api/v1/auth/login") ||
            req.path.startsWith("/api/v1/auth/register") ||
            req.path.startsWith("/api/v1/auth/google") ||
            req.path.startsWith("/api/v1/auth/2fa/login-verify") ||
            req.path.startsWith("/api/v1/billing/webhook");
        if (exempt || ["GET", "HEAD", "OPTIONS"].includes(req.method))
            return next();
        return (0, csrf_1.doubleCsrfProtection)(req, res, next);
    });
    if (!env_1.isProd) {
        app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
    }
    app.use("/api/v1", routes_1.apiRouter);
    app.use(error_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map