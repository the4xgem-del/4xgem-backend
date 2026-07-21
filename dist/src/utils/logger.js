"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("../config/env");
function buildLogger() {
    const base = {
        level: env_1.isTest ? "silent" : env_1.env.LOG_LEVEL,
        redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash"],
    };
    if (env_1.isProd || env_1.isTest) {
        return (0, pino_1.default)(base);
    }
    // Pretty-printing in development is a nice-to-have, not a dependency the
    // app should crash over. pino-pretty runs in a worker thread that
    // resolves its target module by absolute path; in some setups (e.g. an
    // npm-workspaces monorepo where hoisting can put it in a different
    // node_modules than the one the worker resolves against) that lookup can
    // fail. Fall back to plain structured logging rather than taking the
    // whole process down over a logging cosmetic.
    try {
        return (0, pino_1.default)({
            ...base,
            transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
        });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn("pino-pretty transport unavailable, falling back to plain JSON logs:", err);
        return (0, pino_1.default)(base);
    }
}
exports.logger = buildLogger();
//# sourceMappingURL=logger.js.map