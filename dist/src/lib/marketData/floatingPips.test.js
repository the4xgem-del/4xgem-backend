"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const marketData_1 = require("../../lib/marketData");
(0, vitest_1.describe)("computeFloatingPips", () => {
    (0, vitest_1.it)("returns positive pips for a BUY when price rose above entry", () => {
        const pips = (0, marketData_1.computeFloatingPips)("EURUSD", "BUY", 1.085, 1.0865);
        (0, vitest_1.expect)(pips).toBeCloseTo(15, 1); // (1.0865 - 1.085) / 0.0001 = 15
    });
    (0, vitest_1.it)("returns negative pips for a BUY when price fell below entry", () => {
        const pips = (0, marketData_1.computeFloatingPips)("EURUSD", "BUY", 1.085, 1.084);
        (0, vitest_1.expect)(pips).toBeCloseTo(-10, 1);
    });
    (0, vitest_1.it)("returns positive pips for a SELL when price fell below entry", () => {
        const pips = (0, marketData_1.computeFloatingPips)("EURUSD", "SELL", 1.085, 1.0835);
        (0, vitest_1.expect)(pips).toBeCloseTo(15, 1);
    });
    (0, vitest_1.it)("returns negative pips for a SELL when price rose above entry", () => {
        const pips = (0, marketData_1.computeFloatingPips)("EURUSD", "SELL", 1.085, 1.086);
        (0, vitest_1.expect)(pips).toBeCloseTo(-10, 1);
    });
    (0, vitest_1.it)("treats BUY_LIMIT the same as BUY and SELL_LIMIT the same as SELL", () => {
        (0, vitest_1.expect)((0, marketData_1.computeFloatingPips)("EURUSD", "BUY_LIMIT", 1.085, 1.0865)).toBeCloseTo(15, 1);
        (0, vitest_1.expect)((0, marketData_1.computeFloatingPips)("EURUSD", "SELL_LIMIT", 1.085, 1.0835)).toBeCloseTo(15, 1);
    });
    (0, vitest_1.it)("uses gold's point size (not forex pip size) for XAUUSD", () => {
        // Gold pipSize is 0.1, so a $2 move is 20 points.
        const pips = (0, marketData_1.computeFloatingPips)("XAUUSD", "BUY", 2345.5, 2347.5);
        (0, vitest_1.expect)(pips).toBeCloseTo(20, 1);
    });
    (0, vitest_1.it)("returns null for a pair that isn't in the watchlist", () => {
        (0, vitest_1.expect)((0, marketData_1.computeFloatingPips)("NZDCHF", "BUY", 1, 1.001)).toBeNull();
    });
    (0, vitest_1.it)("returns 0 when price hasn't moved from entry", () => {
        (0, vitest_1.expect)((0, marketData_1.computeFloatingPips)("EURUSD", "BUY", 1.085, 1.085)).toBe(0);
    });
});
//# sourceMappingURL=floatingPips.test.js.map