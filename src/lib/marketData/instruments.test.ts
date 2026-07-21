import { describe, it, expect } from "vitest";
import { instrumentForPair, instrumentForSymbol, WATCHED_INSTRUMENTS } from "@/lib/marketData/instruments";

describe("instrumentForPair", () => {
  it("finds gold by its display pair convention", () => {
    const instrument = instrumentForPair("XAUUSD");
    expect(instrument?.symbol).toBe("XAU/USD");
    expect(instrument?.category).toBe("GOLD");
  });

  it("is case-insensitive", () => {
    expect(instrumentForPair("eurusd")?.symbol).toBe("EUR/USD");
  });

  it("returns undefined for an unwatched pair", () => {
    expect(instrumentForPair("NZDCHF")).toBeUndefined();
  });
});

describe("instrumentForSymbol", () => {
  it("finds an instrument by its provider-format symbol", () => {
    expect(instrumentForSymbol("BTC/USD")?.displayPair).toBe("BTCUSD");
  });
});

describe("WATCHED_INSTRUMENTS", () => {
  it("covers gold and at least one forex and one crypto pair, per the product requirement", () => {
    const categories = new Set(WATCHED_INSTRUMENTS.map((i) => i.category));
    expect(categories.has("GOLD")).toBe(true);
    expect(categories.has("FOREX")).toBe(true);
    expect(categories.has("CRYPTO")).toBe(true);
  });

  it("gives every instrument a positive pip size and base price", () => {
    for (const instrument of WATCHED_INSTRUMENTS) {
      expect(instrument.pipSize).toBeGreaterThan(0);
      expect(instrument.basePrice).toBeGreaterThan(0);
    }
  });
});
