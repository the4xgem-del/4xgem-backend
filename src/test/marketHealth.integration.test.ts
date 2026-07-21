import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

describe("GET /api/v1/market/health", () => {
  it("returns provider health with the simulated provider running", async () => {
    const { createApp } = await import("@/app");
    const app = createApp();

    const res = await request(app).get("/api/v1/market/health");

    expect([200, 503]).toContain(res.status);
    expect(res.body.data).toMatchObject({
      providerName: "SimulatedProvider",
      healthStatus: expect.any(String),
      metrics: expect.objectContaining({
        tickCount: expect.any(Number),
        tickRatePerMinute: expect.any(Number),
        reconnectCount: expect.any(Number),
        droppedMessages: expect.any(Number),
        errorCount: expect.any(Number),
        uptimeMs: expect.any(Number),
      }),
    });
  });
});
