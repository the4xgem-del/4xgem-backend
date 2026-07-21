"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const instruments_1 = require("../../lib/marketData/instruments");
(0, vitest_1.describe)("instrumentForPair", () => {
    (0, vitest_1.it)("finds gold by its display pair convention", () => {
        const instrument = (0, instruments_1.instrumentForPair)("XAUUSD");
        (0, vitest_1.expect)(instrument?.symbol).toBe("XAU/USD");
        (0, vitest_1.expect)(instrument?.category).toBe("GOLD");
    });
    (0, vitest_1.it)("is case-insensitive", () => {
        (0, vitest_1.expect)((0, instruments_1.instrumentForPair)("eurusd")?.symbol).toBe("EUR/USD");
    });
    (0, vitest_1.it)("returns undefined for an unwatched pair", () => {
        (0, vitest_1.expect)((0, instruments_1.instrumentForPair)("NZDCHF")).toBeUndefined();
    });
});
(0, vitest_1.describe)("instrumentForSymbol", () => {
    (0, vitest_1.it)("finds an instrument by its provider-format symbol", () => {
        (0, vitest_1.expect)((0, instruments_1.instrumentForSymbol)("BTC/USD")?.displayPair).toBe("BTCUSD");
    });
});
(0, vitest_1.describe)("WATCHED_INSTRUMENTS", () => {
    (0, vitest_1.it)("covers gold and at least one forex and one crypto pair, per the product requirement", () => {
        const categories = new Set(instruments_1.WATCHED_INSTRUMENTS.map((i) => i.category));
        (0, vitest_1.expect)(categories.has("GOLD")).toBe(true);
        (0, vitest_1.expect)(categories.has("FOREX")).toBe(true);
        (0, vitest_1.expect)(categories.has("CRYPTO")).toBe(true);
    });
    (0, vitest_1.it)("gives every instrument a positive pip size and base price", () => {
        for (const instrument of instruments_1.WATCHED_INSTRUMENTS) {
            (0, vitest_1.expect)(instrument.pipSize).toBeGreaterThan(0);
            (0, vitest_1.expect)(instrument.basePrice).toBeGreaterThan(0);
        }
    });
});
//# sourceMappingURL=instruments.test.js.map