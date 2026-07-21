"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock("@/lib/redis", () => ({
    redis: { set: vitest_1.vi.fn(), get: vitest_1.vi.fn(), keys: vitest_1.vi.fn(), mget: vitest_1.vi.fn() },
}));
const ORIGINAL_ENV = { ...process.env };
(0, vitest_1.describe)("Market data provider factory", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });
    (0, vitest_1.afterEach)(() => {
        process.env = { ...ORIGINAL_ENV };
    });
    (0, vitest_1.it)("uses SimulatedProvider when MARKET_DATA_PROVIDER=simulated, regardless of environment", async () => {
        process.env.MARKET_DATA_PROVIDER = "simulated";
        delete process.env.TWELVE_DATA_API_KEY;
        process.env.NODE_ENV = "production";
        const { marketDataProvider } = await Promise.resolve().then(() => __importStar(require("../../lib/marketData")));
        (0, vitest_1.expect)(marketDataProvider.constructor.name).toBe("SimulatedProvider");
    });
    (0, vitest_1.it)("uses TwelveDataProvider when MARKET_DATA_PROVIDER=twelvedata and an API key is set", async () => {
        process.env.MARKET_DATA_PROVIDER = "twelvedata";
        process.env.TWELVE_DATA_API_KEY = "test-key-123";
        process.env.NODE_ENV = "production";
        const { marketDataProvider } = await Promise.resolve().then(() => __importStar(require("../../lib/marketData")));
        (0, vitest_1.expect)(marketDataProvider.constructor.name).toBe("TwelveDataProvider");
    });
    (0, vitest_1.it)("falls back to SimulatedProvider in development when twelvedata is requested but no API key is set", async () => {
        process.env.MARKET_DATA_PROVIDER = "twelvedata";
        delete process.env.TWELVE_DATA_API_KEY;
        process.env.NODE_ENV = "development";
        const { marketDataProvider } = await Promise.resolve().then(() => __importStar(require("../../lib/marketData")));
        (0, vitest_1.expect)(marketDataProvider.constructor.name).toBe("SimulatedProvider");
    });
    (0, vitest_1.it)("throws at import time (fails fast) in production when twelvedata is requested but no API key is set — never silently serves fake data as real", async () => {
        process.env.MARKET_DATA_PROVIDER = "twelvedata";
        delete process.env.TWELVE_DATA_API_KEY;
        process.env.NODE_ENV = "production";
        await (0, vitest_1.expect)(Promise.resolve().then(() => __importStar(require("../../lib/marketData")))).rejects.toThrow(/TWELVE_DATA_API_KEY/);
    });
});
//# sourceMappingURL=providerFactory.test.js.map