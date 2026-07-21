"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const signals_schema_1 = require("../../modules/signals/signals.schema");
(0, vitest_1.describe)("listSignalsQuerySchema", () => {
    (0, vitest_1.it)("applies sensible defaults when nothing is provided", () => {
        const result = signals_schema_1.listSignalsQuerySchema.parse({});
        (0, vitest_1.expect)(result).toEqual({ sort: "newest", page: 1, pageSize: 20 });
    });
    (0, vitest_1.it)("rejects an unknown category", () => {
        (0, vitest_1.expect)(signals_schema_1.listSignalsQuerySchema.safeParse({ category: "NOT_REAL" }).success).toBe(false);
    });
    (0, vitest_1.it)("coerces string query params to numbers", () => {
        const result = signals_schema_1.listSignalsQuerySchema.parse({ page: "3", pageSize: "10" });
        (0, vitest_1.expect)(result.page).toBe(3);
        (0, vitest_1.expect)(result.pageSize).toBe(10);
    });
    (0, vitest_1.it)("caps pageSize at 50", () => {
        (0, vitest_1.expect)(signals_schema_1.listSignalsQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
    });
});
(0, vitest_1.describe)("createSignalSchema", () => {
    const base = {
        pair: "EUR/USD",
        name: "Euro / Dollar",
        category: "FOREX",
        direction: "BUY",
        entry: 1.085,
        stopLoss: 1.08,
        takeProfit1: 1.09,
        riskPercent: 1.5,
    };
    (0, vitest_1.it)("accepts a minimal valid signal", () => {
        (0, vitest_1.expect)(signals_schema_1.createSignalSchema.safeParse(base).success).toBe(true);
    });
    (0, vitest_1.it)("rejects a negative entry price", () => {
        (0, vitest_1.expect)(signals_schema_1.createSignalSchema.safeParse({ ...base, entry: -1 }).success).toBe(false);
    });
    (0, vitest_1.it)("rejects risk percent above 10", () => {
        (0, vitest_1.expect)(signals_schema_1.createSignalSchema.safeParse({ ...base, riskPercent: 25 }).success).toBe(false);
    });
    (0, vitest_1.it)("defaults requiredTier to FREE and confidence to 50", () => {
        const result = signals_schema_1.createSignalSchema.parse(base);
        (0, vitest_1.expect)(result.requiredTier).toBe("FREE");
        (0, vitest_1.expect)(result.confidence).toBe(50);
    });
});
//# sourceMappingURL=signals.schema.test.js.map