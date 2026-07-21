"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const simulatedProvider_1 = require("../../lib/marketData/simulatedProvider");
const instruments_1 = require("../../lib/marketData/instruments");
(0, vitest_1.describe)("SimulatedProvider", () => {
    let provider;
    (0, vitest_1.afterEach)(() => {
        provider?.stop();
    });
    (0, vitest_1.it)("is not ready before start() is called", () => {
        provider = new simulatedProvider_1.SimulatedProvider();
        (0, vitest_1.expect)(provider.isReady()).toBe(false);
        (0, vitest_1.expect)(provider.getAllLatest()).toHaveLength(0);
    });
    (0, vitest_1.it)("becomes ready and emits an initial tick for every watched instrument on start()", async () => {
        provider = new simulatedProvider_1.SimulatedProvider();
        const seen = new Set();
        provider.on("tick", (tick) => seen.add(tick.symbol));
        await provider.start();
        (0, vitest_1.expect)(provider.isReady()).toBe(true);
        for (const instrument of instruments_1.WATCHED_INSTRUMENTS) {
            (0, vitest_1.expect)(seen.has(instrument.symbol)).toBe(true);
        }
    });
    (0, vitest_1.it)("getLatest returns the instrument's exact base price immediately after start", async () => {
        provider = new simulatedProvider_1.SimulatedProvider();
        await provider.start();
        const gold = provider.getLatest("XAU/USD");
        (0, vitest_1.expect)(gold).not.toBeNull();
        const goldInstrument = instruments_1.WATCHED_INSTRUMENTS.find((i) => i.symbol === "XAU/USD");
        (0, vitest_1.expect)(gold.price).toBe(goldInstrument.basePrice);
    });
    (0, vitest_1.it)("emits subsequent ticks with plausible, bounded price movement", async () => {
        provider = new simulatedProvider_1.SimulatedProvider();
        await provider.start();
        const btcTicks = [];
        provider.on("tick", (tick) => {
            if (tick.symbol === "BTC/USD")
                btcTicks.push(tick.price);
        });
        await new Promise((resolve) => setTimeout(resolve, 2200));
        (0, vitest_1.expect)(btcTicks.length).toBeGreaterThan(0);
        const btcInstrument = instruments_1.WATCHED_INSTRUMENTS.find((i) => i.symbol === "BTC/USD");
        for (const price of btcTicks) {
            (0, vitest_1.expect)(Math.abs(price - btcInstrument.basePrice)).toBeLessThan(btcInstrument.basePrice * 0.05);
        }
    }, 5000);
    (0, vitest_1.it)("stop() halts further ticking", async () => {
        provider = new simulatedProvider_1.SimulatedProvider();
        await provider.start();
        provider.stop();
        let tickedAfterStop = false;
        provider.on("tick", () => {
            tickedAfterStop = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 2200));
        (0, vitest_1.expect)(tickedAfterStop).toBe(false);
    }, 5000);
});
//# sourceMappingURL=simulatedProvider.test.js.map