"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignalSchema = exports.listSignalsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listSignalsQuerySchema = zod_1.z.object({
    category: zod_1.z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]).optional(),
    status: zod_1.z.enum(["OPEN", "RUNNING", "HIT_TP1", "HIT_TP2", "HIT_TP3", "HIT_SL", "CLOSED"]).optional(),
    sort: zod_1.z.enum(["newest", "oldest", "confidence"]).default("newest"),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
exports.createSignalSchema = zod_1.z.object({
    pair: zod_1.z.string().min(1).max(20),
    name: zod_1.z.string().min(1).max(80),
    category: zod_1.z.enum(["FOREX", "GOLD", "CRYPTO", "INDICES", "COMMODITIES"]),
    direction: zod_1.z.enum(["BUY", "SELL", "BUY_LIMIT", "SELL_LIMIT"]),
    entry: zod_1.z.coerce.number().positive(),
    stopLoss: zod_1.z.coerce.number().positive(),
    takeProfit1: zod_1.z.coerce.number().positive(),
    takeProfit2: zod_1.z.coerce.number().positive().optional(),
    takeProfit3: zod_1.z.coerce.number().positive().optional(),
    riskPercent: zod_1.z.coerce.number().min(0.1).max(10),
    confidence: zod_1.z.coerce.number().int().min(0).max(100).default(50),
    requiredTier: zod_1.z.enum(["FREE", "BASIC", "PREMIUM", "VIP"]).default("FREE"),
});
//# sourceMappingURL=signals.schema.js.map