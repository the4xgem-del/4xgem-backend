"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewsSchema = exports.listNewsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listNewsQuerySchema = zod_1.z.object({
    category: zod_1.z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]).optional(),
    impact: zod_1.z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
exports.createNewsSchema = zod_1.z.object({
    category: zod_1.z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]),
    impact: zod_1.z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    title: zod_1.z.string().min(1).max(200),
    summary: zod_1.z.string().min(1).max(500),
    body: zod_1.z.string().optional(),
});
//# sourceMappingURL=news.schema.js.map