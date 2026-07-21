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
const usersById = new Map();
const usersByEmail = new Map();
const usersByGoogleId = new Map();
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;
let mockVerifyResult;
vitest_1.vi.mock("google-auth-library", () => ({
    OAuth2Client: class {
        async verifyIdToken() {
            if (typeof mockVerifyResult === "function")
                return mockVerifyResult();
            return mockVerifyResult;
        }
    },
}));
vitest_1.vi.mock("@prisma/client", () => ({
    RoleName: { ADMIN: "ADMIN", EDITOR: "EDITOR", ANALYST: "ANALYST", SUBSCRIBER: "SUBSCRIBER", USER: "USER" },
    Prisma: {},
}));
vitest_1.vi.mock("@/lib/prisma", () => ({
    prisma: {
        role: { upsert: vitest_1.vi.fn().mockResolvedValue({ id: "role-user", name: "USER" }) },
        user: {
            findUnique: vitest_1.vi.fn(async ({ where }) => {
                if (where.googleId)
                    return usersByGoogleId.get(where.googleId) ?? null;
                if (where.email)
                    return usersByEmail.get(where.email) ?? null;
                if (where.id)
                    return usersById.get(where.id) ?? null;
                return null;
            }),
            findUniqueOrThrow: vitest_1.vi.fn(async ({ where }) => {
                const user = usersById.get(where.id);
                if (!user)
                    throw new Error("not found");
                return user;
            }),
            create: vitest_1.vi.fn(async ({ data }) => {
                const user = {
                    id: nextId(),
                    email: data.email,
                    passwordHash: data.passwordHash ?? null,
                    googleId: data.googleId ?? null,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    avatarUrl: data.avatarUrl ?? null,
                    status: data.status ?? "PENDING_VERIFICATION",
                    emailVerifiedAt: data.emailVerifiedAt ?? null,
                    roleId: "role-user",
                    createdAt: new Date(),
                    role: { name: "USER" },
                };
                usersById.set(user.id, user);
                usersByEmail.set(user.email, user);
                if (user.googleId)
                    usersByGoogleId.set(user.googleId, user);
                return user;
            }),
            update: vitest_1.vi.fn(async ({ where, data }) => {
                const user = usersById.get(where.id);
                Object.assign(user, data);
                if (user.googleId)
                    usersByGoogleId.set(user.googleId, user);
                return user;
            }),
        },
        activityLog: { create: vitest_1.vi.fn().mockResolvedValue({}) },
        refreshToken: {
            create: vitest_1.vi.fn(async ({ data }) => ({
                id: nextId(),
                userId: data.userId,
                revokedAt: null,
                expiresAt: data.expiresAt,
            })),
            updateMany: vitest_1.vi.fn().mockResolvedValue({ count: 0 }),
        },
    },
}));
function googlePayload(overrides = {}) {
    return {
        sub: "google-sub-123",
        email: "trader@example.com",
        email_verified: true,
        given_name: "Ada",
        family_name: "Lovelace",
        picture: "https://example.com/avatar.jpg",
        ...overrides,
    };
}
(0, vitest_1.describe)("POST /api/v1/auth/google", () => {
    let app;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.resetModules();
        usersById.clear();
        usersByEmail.clear();
        usersByGoogleId.clear();
        process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
        mockVerifyResult = { getPayload: () => googlePayload() };
        const { createApp } = await Promise.resolve().then(() => __importStar(require("../app")));
        app = createApp();
    });
    (0, vitest_1.it)("creates a brand new account on first Google sign-in, pre-verified with no password", async () => {
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.email).toBe("trader@example.com");
        (0, vitest_1.expect)(res.body.data.twoFactorRequired).toBe(false);
        const cookies = res.headers["set-cookie"];
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
        const created = usersByEmail.get("trader@example.com");
        (0, vitest_1.expect)(created.passwordHash).toBeNull();
        (0, vitest_1.expect)(created.googleId).toBe("google-sub-123");
        (0, vitest_1.expect)(created.emailVerifiedAt).not.toBeNull();
    });
    (0, vitest_1.it)("logs straight in on a second sign-in from the same Google account", async () => {
        await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(usersByEmail.size).toBe(1);
    });
    (0, vitest_1.it)("links to an existing account with the same email instead of creating a duplicate", async () => {
        usersById.set("existing-1", {
            id: "existing-1",
            email: "trader@example.com",
            passwordHash: "some-argon2-hash",
            googleId: null,
            status: "ACTIVE",
            emailVerifiedAt: new Date(),
            roleId: "role-user",
            createdAt: new Date(),
            role: { name: "USER" },
        });
        usersByEmail.set("trader@example.com", usersById.get("existing-1"));
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(usersByEmail.size).toBe(1);
        const linked = usersByEmail.get("trader@example.com");
        (0, vitest_1.expect)(linked.googleId).toBe("google-sub-123");
        (0, vitest_1.expect)(linked.passwordHash).toBe("some-argon2-hash");
    });
    (0, vitest_1.it)("rejects a Google account whose email isn't verified", async () => {
        mockVerifyResult = { getPayload: () => googlePayload({ email_verified: false }) };
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error.code).toBe("GOOGLE_EMAIL_UNVERIFIED");
    });
    (0, vitest_1.it)("rejects an invalid/unverifiable token", async () => {
        mockVerifyResult = () => {
            throw new Error("invalid token signature");
        };
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("INVALID_GOOGLE_TOKEN");
    });
    (0, vitest_1.it)("returns 503 when Google Sign-In isn't configured", async () => {
        delete process.env.GOOGLE_CLIENT_ID;
        vitest_1.vi.resetModules();
        const { createApp } = await Promise.resolve().then(() => __importStar(require("../app")));
        const unconfiguredApp = createApp();
        const res = await (0, supertest_1.default)(unconfiguredApp).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
        (0, vitest_1.expect)(res.status).toBe(503);
        (0, vitest_1.expect)(res.body.error.code).toBe("GOOGLE_SIGNIN_NOT_CONFIGURED");
    });
    (0, vitest_1.it)("rejects a request without an idToken", async () => {
        const res = await (0, supertest_1.default)(app).post("/api/v1/auth/google").send({});
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
//# sourceMappingURL=googleAuth.integration.test.js.map