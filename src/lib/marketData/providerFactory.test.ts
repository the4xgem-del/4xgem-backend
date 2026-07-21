import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: { set: vi.fn(), get: vi.fn(), keys: vi.fn(), mget: vi.fn() },
}));

const ORIGINAL_ENV = { ...process.env };

describe("Market data provider factory", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses SimulatedProvider when MARKET_DATA_PROVIDER=simulated, regardless of environment", async () => {
    process.env.MARKET_DATA_PROVIDER = "simulated";
    delete process.env.TWELVE_DATA_API_KEY;
    process.env.NODE_ENV = "production";

    const { marketDataProvider } = await import("@/lib/marketData");
    expect(marketDataProvider.constructor.name).toBe("SimulatedProvider");
  });

  it("uses TwelveDataProvider when MARKET_DATA_PROVIDER=twelvedata and an API key is set", async () => {
    process.env.MARKET_DATA_PROVIDER = "twelvedata";
    process.env.TWELVE_DATA_API_KEY = "test-key-123";
    process.env.NODE_ENV = "production";

    const { marketDataProvider } = await import("@/lib/marketData");
    expect(marketDataProvider.constructor.name).toBe("TwelveDataProvider");
  });

  it("falls back to SimulatedProvider in development when twelvedata is requested but no API key is set", async () => {
    process.env.MARKET_DATA_PROVIDER = "twelvedata";
    delete process.env.TWELVE_DATA_API_KEY;
    process.env.NODE_ENV = "development";

    const { marketDataProvider } = await import("@/lib/marketData");
    expect(marketDataProvider.constructor.name).toBe("SimulatedProvider");
  });

  it("throws at import time (fails fast) in production when twelvedata is requested but no API key is set — never silently serves fake data as real", async () => {
    process.env.MARKET_DATA_PROVIDER = "twelvedata";
    delete process.env.TWELVE_DATA_API_KEY;
    process.env.NODE_ENV = "production";

    await expect(import("@/lib/marketData")).rejects.toThrow(/TWELVE_DATA_API_KEY/);
  });
});
