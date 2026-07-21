"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const me_schema_1 = require("../../modules/me/me.schema");
(0, vitest_1.describe)("updateProfileSchema", () => {
    (0, vitest_1.it)("allows updating just one field", () => {
        (0, vitest_1.expect)(me_schema_1.updateProfileSchema.safeParse({ firstName: "Ada" }).success).toBe(true);
    });
    (0, vitest_1.it)("rejects an empty string name", () => {
        (0, vitest_1.expect)(me_schema_1.updateProfileSchema.safeParse({ firstName: "" }).success).toBe(false);
    });
});
(0, vitest_1.describe)("updatePreferencesSchema", () => {
    (0, vitest_1.it)("accepts a partial preferences update", () => {
        (0, vitest_1.expect)(me_schema_1.updatePreferencesSchema.safeParse({ emailAlerts: false }).success).toBe(true);
    });
    (0, vitest_1.it)("caps favoriteInstruments at 50 entries", () => {
        const tooMany = Array.from({ length: 51 }, (_, i) => `PAIR${i}`);
        (0, vitest_1.expect)(me_schema_1.updatePreferencesSchema.safeParse({ favoriteInstruments: tooMany }).success).toBe(false);
    });
    (0, vitest_1.it)("rejects an invalid theme value", () => {
        (0, vitest_1.expect)(me_schema_1.updatePreferencesSchema.safeParse({ theme: "solarized" }).success).toBe(false);
    });
});
//# sourceMappingURL=me.schema.test.js.map