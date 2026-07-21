"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotificationsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listNotificationsQuerySchema = zod_1.z.object({
    unreadOnly: zod_1.z.coerce.boolean().default(false),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
//# sourceMappingURL=notifications.schema.js.map