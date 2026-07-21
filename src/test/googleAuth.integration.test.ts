import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

interface FakeUser {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  roleId: string;
  createdAt: Date;
  role: { name: string };
}

const usersById = new Map<string, FakeUser>();
const usersByEmail = new Map<string, FakeUser>();
const usersByGoogleId = new Map<string, FakeUser>();
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

let mockVerifyResult: { getPayload: () => unknown } | (() => never);

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async verifyIdToken() {
      if (typeof mockVerifyResult === "function") return mockVerifyResult();
      return mockVerifyResult;
    }
  },
}));

vi.mock("@prisma/client", () => ({
  RoleName: { ADMIN: "ADMIN", EDITOR: "EDITOR", ANALYST: "ANALYST", SUBSCRIBER: "SUBSCRIBER", USER: "USER" },
  Prisma: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    role: { upsert: vi.fn().mockResolvedValue({ id: "role-user", name: "USER" }) },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string; googleId?: string } }) => {
        if (where.googleId) return usersByGoogleId.get(where.googleId) ?? null;
        if (where.email) return usersByEmail.get(where.email) ?? null;
        if (where.id) return usersById.get(where.id) ?? null;
        return null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const user = usersById.get(where.id);
        if (!user) throw new Error("not found");
        return user;
      }),
      create: vi.fn(async ({ data }: { data: Partial<FakeUser> }) => {
        const user: FakeUser = {
          id: nextId(),
          email: data.email!,
          passwordHash: data.passwordHash ?? null,
          googleId: data.googleId ?? null,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl ?? null,
          status: (data.status as string) ?? "PENDING_VERIFICATION",
          emailVerifiedAt: (data.emailVerifiedAt as Date | undefined) ?? null,
          roleId: "role-user",
          createdAt: new Date(),
          role: { name: "USER" },
        };
        usersById.set(user.id, user);
        usersByEmail.set(user.email, user);
        if (user.googleId) usersByGoogleId.set(user.googleId, user);
        return user;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
        const user = usersById.get(where.id)!;
        Object.assign(user, data);
        if (user.googleId) usersByGoogleId.set(user.googleId, user);
        return user;
      }),
    },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
    refreshToken: {
      create: vi.fn(async ({ data }: { data: { userId: string; expiresAt: Date } }) => ({
        id: nextId(),
        userId: data.userId,
        revokedAt: null,
        expiresAt: data.expiresAt,
      })),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

function googlePayload(overrides: Partial<Record<string, unknown>> = {}) {
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

describe("POST /api/v1/auth/google", () => {
  let app: Express;

  beforeEach(async () => {
    vi.resetModules();
    usersById.clear();
    usersByEmail.clear();
    usersByGoogleId.clear();
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    mockVerifyResult = { getPayload: () => googlePayload() };
    const { createApp } = await import("@/app");
    app = createApp();
  });

  it("creates a brand new account on first Google sign-in, pre-verified with no password", async () => {
    const res = await request(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("trader@example.com");
    expect(res.body.data.twoFactorRequired).toBe(false);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);

    const created = usersByEmail.get("trader@example.com")!;
    expect(created.passwordHash).toBeNull();
    expect(created.googleId).toBe("google-sub-123");
    expect(created.emailVerifiedAt).not.toBeNull();
  });

  it("logs straight in on a second sign-in from the same Google account", async () => {
    await request(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });
    const res = await request(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });

    expect(res.status).toBe(200);
    expect(usersByEmail.size).toBe(1);
  });

  it("links to an existing account with the same email instead of creating a duplicate", async () => {
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
    usersByEmail.set("trader@example.com", usersById.get("existing-1")!);

    const res = await request(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });

    expect(res.status).toBe(200);
    expect(usersByEmail.size).toBe(1);
    const linked = usersByEmail.get("trader@example.com")!;
    expect(linked.googleId).toBe("google-sub-123");
    expect(linked.passwordHash).toBe("some-argon2-hash");
  });

  it("rejects a Google account whose email isn't verified", async () => {
    mockVerifyResult = { getPayload: () => googlePayload({ email_verified: false }) };

    const res = await request(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("GOOGLE_EMAIL_UNVERIFIED");
  });

  it("rejects an invalid/unverifiable token", async () => {
    mockVerifyResult = () => {
      throw new Error("invalid token signature");
    };

    const res = await request(app).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_GOOGLE_TOKEN");
  });

  it("returns 503 when Google Sign-In isn't configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    vi.resetModules();
    const { createApp } = await import("@/app");
    const unconfiguredApp = createApp();

    const res = await request(unconfiguredApp).post("/api/v1/auth/google").send({ idToken: "a".repeat(40) });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("GOOGLE_SIGNIN_NOT_CONFIGURED");
  });

  it("rejects a request without an idToken", async () => {
    const res = await request(app).post("/api/v1/auth/google").send({});
    expect(res.status).toBe(400);
  });
});
