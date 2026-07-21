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
    prisma: {
        $queryRaw: vitest_1.vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    },
}));
(0, vitest_1.describe)("GET /api/v1/health", () => {
    (0, vitest_1.it)("reports healthy when the DB check succeeds and Redis is reachable", async () => {
        const { createApp } = await Promise.resolve().then(() => __importStar(require("../app")));
        const app = createApp();
        const res = await (0, supertest_1.default)(app).get("/api/v1/health");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("healthy");
        (0, vitest_1.expect)(res.body.checks).toEqual({ database: "ok", redis: "ok" });
    });
    (0, vitest_1.it)("reports degraded (503) when the DB check throws", async () => {
        vitest_1.vi.resetModules();
        vitest_1.vi.doMock("@/lib/prisma", () => ({
            prisma: {
                $queryRaw: vitest_1.vi.fn().mockRejectedValue(new Error("connection refused")),
            },
        }));
        const { createApp } = await Promise.resolve().then(() => __importStar(require("../app")));
        const app = createApp();
        const res = await (0, supertest_1.default)(app).get("/api/v1/health");
        (0, vitest_1.expect)(res.status).toBe(503);
        (0, vitest_1.expect)(res.body.status).toBe("degraded");
        (0, vitest_1.expect)(res.body.checks.database).toBe("down");
    });
});
//# sourceMappingURL=health.integration.test.js.map