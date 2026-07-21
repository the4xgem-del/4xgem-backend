"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProgressSchema = void 0;
const zod_1 = require("zod");
exports.updateProgressSchema = zod_1.z.object({
    progressPercent: zod_1.z.coerce.number().int().min(0).max(100),
});
//# sourceMappingURL=education.schema.js.map