"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferencesSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(60).optional(),
    lastName: zod_1.z.string().min(1).max(60).optional(),
});
exports.updatePreferencesSchema = zod_1.z.object({
    theme: zod_1.z.enum(["light", "dark"]).optional(),
    emailAlerts: zod_1.z.boolean().optional(),
    pushAlerts: zod_1.z.boolean().optional(),
    telegramAlerts: zod_1.z.boolean().optional(),
    favoriteInstruments: zod_1.z.array(zod_1.z.string().max(20)).max(50).optional(),
    timezone: zod_1.z.string().max(60).optional(),
});
//# sourceMappingURL=me.schema.js.map