"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventSchema = exports.listEventsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listEventsQuerySchema = zod_1.z.object({
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    impact: zod_1.z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});
exports.createEventSchema = zod_1.z.object({
    eventTime: zod_1.z.string().datetime(),
    country: zod_1.z.string().min(1).max(60),
    currency: zod_1.z.string().min(2).max(6),
    title: zod_1.z.string().min(1).max(200),
    impact: zod_1.z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    previous: zod_1.z.string().max(30).optional(),
    forecast: zod_1.z.string().max(30).optional(),
    actual: zod_1.z.string().max(30).optional(),
});
//# sourceMappingURL=calendar.schema.js.map