"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.listUsersQuerySchema = void 0;
const zod_1 = require("zod");
exports.listUsersQuerySchema = zod_1.z.object({
    search: zod_1.z.string().max(120).optional(),
    role: zod_1.z.enum(["ADMIN", "EDITOR", "ANALYST", "SUBSCRIBER", "USER"]).optional(),
    status: zod_1.z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "DEACTIVATED"]).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.updateUserSchema = zod_1.z.object({
    role: zod_1.z.enum(["ADMIN", "EDITOR", "ANALYST", "SUBSCRIBER", "USER"]).optional(),
    status: zod_1.z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "DEACTIVATED"]).optional(),
});
//# sourceMappingURL=users.schema.js.map