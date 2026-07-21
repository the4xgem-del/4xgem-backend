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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
vitest_1.vi.mock("@/lib/prisma", () => ({
    prisma: {},
}));
(0, vitest_1.describe)("GET /api/v1/market/health", () => {
    (0, vitest_1.it)("returns provider health with the simulated provider running", async () => {
        const { createApp } = await Promise.resolve().then(() => __importStar(require("../app")));
        const app = createApp();
        const res = await (0, supertest_1.default)(app).get("/api/v1/market/health");
        (0, vitest_1.expect)([200, 503]).toContain(res.status);
        (0, vitest_1.expect)(res.body.data).toMatchObject({
            providerName: "SimulatedProvider",
            healthStatus: vitest_1.expect.any(String),
            metrics: vitest_1.expect.objectContaining({
                tickCount: vitest_1.expect.any(Number),
                tickRatePerMinute: vitest_1.expect.any(Number),
                reconnectCount: vitest_1.expect.any(Number),
                droppedMessages: vitest_1.expect.any(Number),
                errorCount: vitest_1.expect.any(Number),
                uptimeMs: vitest_1.expect.any(Number),
            }),
        });
    });
});
//# sourceMappingURL=marketHealth.integration.test.js.map