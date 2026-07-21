import { describe, it, expect } from "vitest";
import { listSignalsQuerySchema, createSignalSchema } from "@/modules/signals/signals.schema";

describe("listSignalsQuerySchema", () => {
  it("applies sensible defaults when nothing is provided", () => {
    const result = listSignalsQuerySchema.parse({});
    expect(result).toEqual({ sort: "newest", page: 1, pageSize: 20 });
  });

  it("rejects an unknown category", () => {
    expect(listSignalsQuerySchema.safeParse({ category: "NOT_REAL" }).success).toBe(false);
  });

  it("coerces string query params to numbers", () => {
    const result = listSignalsQuerySchema.parse({ page: "3", pageSize: "10" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
  });

  it("caps pageSize at 50", () => {
    expect(listSignalsQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("createSignalSchema", () => {
  const base = {
    pair: "EUR/USD",
    name: "Euro / Dollar",
    category: "FOREX",
    direction: "BUY",
    entry: 1.085,
    stopLoss: 1.08,
    takeProfit1: 1.09,
    riskPercent: 1.5,
  };

  it("accepts a minimal valid signal", () => {
    expect(createSignalSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a negative entry price", () => {
    expect(createSignalSchema.safeParse({ ...base, entry: -1 }).success).toBe(false);
  });

  it("rejects risk percent above 10", () => {
    expect(createSignalSchema.safeParse({ ...base, riskPercent: 25 }).success).toBe(false);
  });

  it("defaults requiredTier to FREE and confidence to 50", () => {
    const result = createSignalSchema.parse(base);
    expect(result.requiredTier).toBe("FREE");
    expect(result.confidence).toBe(50);
  });
});
