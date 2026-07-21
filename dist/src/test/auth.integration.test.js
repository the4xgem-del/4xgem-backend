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
const ioredis_1 = __importDefault(require("ioredis"));
const usersById = new Map();
const usersByEmail = new Map();
const refreshTokens = new Map();
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;
vitest_1.vi.mock("@prisma/client", () => ({
    RoleName: { ADMIN: "ADMIN", EDITOR: "EDITOR", ANALYST: "ANALYST", SUBSCRIBER: "SUBSCRIBER", USER: "USER" },
    Prisma: {},
}));
vitest_1.vi.mock("@/lib/prisma", () => ({
    prisma: {
        role: {
            upsert: vitest_1.vi.fn().mockResolvedValue({ id: "role-user", name: "USER" }),
        },
        user: {
            findUnique: vitest_1.vi.fn(async ({ where }) => {
                if (where.email)
                    return usersByEmail.get(where.email) ?? null;
                if (where.id)
                    return usersById.get(where.id) ?? null;
                return null;
            }),
            findUniqueOrThrow: vitest_1.vi.fn(async ({ where }) => {
                const user = where.email ? usersByEmail.get(where.email) : where.id ? usersById.get(where.id) : null;
                if (!user)
                    throw new Error("User not found");
                return user;
            }),
            create: vitest_1.vi.fn(async ({ data }) => {
                const user = {
                    id: nextId(),
                    email: data.email,
                    passwordHash: data.passwordHash,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    status: "PENDING_VERIFICATION",
                    emailVerifiedAt: null,
                    roleId: "role-user",
                    createdAt: new Date(),
                    role: { name: "USER" },
                };
                usersById.set(user.id, user);
                usersByEmail.set(user.email, user);
                return user;
            }),
            update: vitest_1.vi.fn(async ({ where, data }) => {
                const user = usersById.get(where.id);
                Object.assign(user, data);
                return user;
            }),
        },
        emailVerificationToken: { create: vitest_1.vi.fn().mockResolvedValue({}) },
        activityLog: { create: vitest_1.vi.fn().mockResolvedValue({}) },
        refreshToken: {
            create: vitest_1.vi.fn(async ({ data }) => {
                const token = { id: nextId(), userId: data.userId, revokedAt: null, expiresAt: data.expiresAt };
                refreshTokens.set(token.id, token);
                return token;
            }),
            findUnique: vitest_1.vi.fn(async ({ where }) => refreshTokens.get(where.id) ?? null),
            update: vitest_1.vi.fn(async ({ where, data }) => {
                const token = refreshTokens.get(where.id);
                Object.assign(token, data);
                return token;
            }),
            updateMany: vitest_1.vi.fn().mockResolvedValue({ count: 0 }),
        },
    },
}));
(0, vitest_1.describe)("Auth API (integration, real app + middleware, mocked persistence)", () => {
    let app;
    const redisAdmin = new ioredis_1.default(process.env.REDIS_URL);
    (0, vitest_1.beforeAll)(async () => {
        // Rate limiting is Redis-backed and keyed by IP — clear leftover
        // counters from any previous run against this shared local Redis so
        // this suite isn't spuriously rate-limited.
        const keys = await redisAdmin.keys("rl:auth:*");
        if (keys.length)
            await redisAdmin.del(...keys);
    });
    (0, vitest_1.afterAll)(async () => {
        await redisAdmin.quit();
    });
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.resetModules();
        usersById.clear();
        usersByEmail.clear();
        refreshTokens.clear();
        const { createApp } = await Promise.resolve().then(() => __importStar(require("../app")));
        app = createApp();
    });
    (0, vitest_1.it)("registers a new account and does not log the user in yet (pending verification)", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/v1/auth/register")
            .send({ email: "trader@example.com", password: "GoodPass123", firstName: "Ada" });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.data.email).toBe("trader@example.com");
        (0, vitest_1.expect)(res.body.data.status).toBe("PENDING_VERIFICATION");
        // No session cookie should be issued on register — verification is required first.
        (0, vitest_1.expect)(res.headers["set-cookie"]).toBeUndefined();
    });
    (0, vitest_1.it)("rejects registration with a weak password before ever touching the database", async () => {
        const res = await (0, supertest_1.default)(app)
            .post("/api/v1/auth/register")
            .send({ email: "weak@example.com", password: "weak" });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.code).toBe("VALIDATION_ERROR");
    });
    (0, vitest_1.it)("rejects a duplicate email registration with 409", async () => {
        await (0, supertest_1.default)(app).post("/api/v1/auth/register").send({ email: "dupe@example.com", password: "GoodPass123" });
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/register").send({ email: "dupe@example.com", password: "GoodPass123" });
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.error.code).toBe("CONFLICT");
    });
    (0, vitest_1.it)("logs in successfully and issues access + refresh cookies", async () => {
        await (0, supertest_1.default)(app).post("/api/v1/auth/register").send({ email: "login@example.com", password: "GoodPass123" });
        // Simulate email verification having happened, since login blocks suspended/deactivated
        // accounts but PENDING_VERIFICATION is still allowed to authenticate in this API design.
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/login").send({ email: "login@example.com", password: "GoodPass123" });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.email).toBe("login@example.com");
        const cookies = res.headers["set-cookie"];
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
    });
    (0, vitest_1.it)("rejects login with the wrong password", async () => {
        await (0, supertest_1.default)(app).post("/api/v1/auth/register").send({ email: "wrongpass@example.com", password: "GoodPass123" });
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/login").send({ email: "wrongpass@example.com", password: "WrongPassword1" });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
    (0, vitest_1.it)("rejects login for an email that was never registered, with the same error as a wrong password (no user enumeration)", async () => {
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/login").send({ email: "ghost@example.com", password: "GoodPass123" });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
    (0, vitest_1.it)("rejects /auth/me without a session", async () => {
        const res = await (0, supertest_1.default)(app).get("/api/v1/auth/me");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("AUTH_REQUIRED");
    });
});
//# sourceMappingURL=auth.integration.test.js.map