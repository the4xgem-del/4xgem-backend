"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
exports.prisma = global.__prisma ??
    new client_1.PrismaClient({
        log: env_1.isProd ? ["error", "warn"] : ["warn", "error"],
    });
if (!env_1.isProd) {
    global.__prisma = exports.prisma;
}
//# sourceMappingURL=prisma.js.map