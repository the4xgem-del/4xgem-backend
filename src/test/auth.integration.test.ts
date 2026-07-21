import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import Redis from "ioredis";

interface FakeUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  status: string;
  emailVerifiedAt: Date | null;
  roleId: string;
  createdAt: Date;
  role: { name: string };
}

const usersById = new Map<string, FakeUser>();
const usersByEmail = new Map<string, FakeUser>();
const refreshTokens = new Map<string, { id: string; userId: string; revokedAt: Date | null; expiresAt: Date }>();
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

vi.mock("@prisma/client", () => ({
  RoleName: { ADMIN: "ADMIN", EDITOR: "EDITOR", ANALYST: "ANALYST", SUBSCRIBER: "SUBSCRIBER", USER: "USER" },
  Prisma: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    role: {
      upsert: vi.fn().mockResolvedValue({ id: "role-user", name: "USER" }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return usersByEmail.get(where.email) ?? null;
        if (where.id) return usersById.get(where.id) ?? null;
        return null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        const user = where.email ? usersByEmail.get(where.email) : where.id ? usersById.get(where.id) : null;
        if (!user) throw new Error("User not found");
        return user;
      }),
      create: vi.fn(async ({ data }: { data: Partial<FakeUser> }) => {
        const user: FakeUser = {
          id: nextId(),
          email: data.email!,
          passwordHash: data.passwordHash!,
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
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
        const user = usersById.get(where.id)!;
        Object.assign(user, data);
        return user;
      }),
    },
    emailVerificationToken: { create: vi.fn().mockResolvedValue({}) },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
    refreshToken: {
      create: vi.fn(async ({ data }: { data: { userId: string; expiresAt: Date } }) => {
        const token = { id: nextId(), userId: data.userId, revokedAt: null, expiresAt: data.expiresAt };
        refreshTokens.set(token.id, token);
        return token;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => refreshTokens.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<{ revokedAt: Date; replacedBy: string }> }) => {
        const token = refreshTokens.get(where.id)!;
        Object.assign(token, data);
        return token;
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

describe("Auth API (integration, real app + middleware, mocked persistence)", () => {
  let app: Express;
  const redisAdmin = new Redis(process.env.REDIS_URL!);

  beforeAll(async () => {
    // Rate limiting is Redis-backed and keyed by IP — clear leftover
    // counters from any previous run against this shared local Redis so
    // this suite isn't spuriously rate-limited.
    const keys = await redisAdmin.keys("rl:auth:*");
    if (keys.length) await redisAdmin.del(...keys);
  });

  afterAll(async () => {
    await redisAdmin.quit();
  });

  beforeEach(async () => {
    vi.resetModules();
    usersById.clear();
    usersByEmail.clear();
    refreshTokens.clear();
    const { createApp } = await import("@/app");
    app = createApp();
  });

  it("registers a new account and does not log the user in yet (pending verification)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "trader@example.com", password: "GoodPass123", firstName: "Ada" });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("trader@example.com");
    expect(res.body.data.status).toBe("PENDING_VERIFICATION");
    // No session cookie should be issued on register — verification is required first.
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects registration with a weak password before ever touching the database", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "weak@example.com", password: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a duplicate email registration with 409", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "dupe@example.com", password: "GoodPass123" });
    const res = await request(app).post("/api/v1/auth/register").send({ email: "dupe@example.com", password: "GoodPass123" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("logs in successfully and issues access + refresh cookies", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "login@example.com", password: "GoodPass123" });
    // Simulate email verification having happened, since login blocks suspended/deactivated
    // accounts but PENDING_VERIFICATION is still allowed to authenticate in this API design.

    const res = await request(app).post("/api/v1/auth/login").send({ email: "login@example.com", password: "GoodPass123" });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("login@example.com");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
  });

  it("rejects login with the wrong password", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "wrongpass@example.com", password: "GoodPass123" });
    const res = await request(app).post("/api/v1/auth/login").send({ email: "wrongpass@example.com", password: "WrongPassword1" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects login for an email that was never registered, with the same error as a wrong password (no user enumeration)", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "ghost@example.com", password: "GoodPass123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects /auth/me without a session", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REQUIRED");
  });
});
