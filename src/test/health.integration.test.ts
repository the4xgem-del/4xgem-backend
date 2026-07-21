import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("GET /api/v1/health", () => {
  it("reports healthy when the DB check succeeds and Redis is reachable", async () => {
    const { createApp } = await import("@/app");
    const app = createApp();

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.checks).toEqual({ database: "ok", redis: "ok" });
  });

  it("reports degraded (503) when the DB check throws", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
    }));

    const { createApp } = await import("@/app");
    const app = createApp();

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.checks.database).toBe("down");
  });
});
