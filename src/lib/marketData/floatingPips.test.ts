import { describe, it, expect } from "vitest";
import { computeFloatingPips } from "@/lib/marketData";

describe("computeFloatingPips", () => {
  it("returns positive pips for a BUY when price rose above entry", () => {
    const pips = computeFloatingPips("EURUSD", "BUY", 1.085, 1.0865);
    expect(pips).toBeCloseTo(15, 1); // (1.0865 - 1.085) / 0.0001 = 15
  });

  it("returns negative pips for a BUY when price fell below entry", () => {
    const pips = computeFloatingPips("EURUSD", "BUY", 1.085, 1.084);
    expect(pips).toBeCloseTo(-10, 1);
  });

  it("returns positive pips for a SELL when price fell below entry", () => {
    const pips = computeFloatingPips("EURUSD", "SELL", 1.085, 1.0835);
    expect(pips).toBeCloseTo(15, 1);
  });

  it("returns negative pips for a SELL when price rose above entry", () => {
    const pips = computeFloatingPips("EURUSD", "SELL", 1.085, 1.086);
    expect(pips).toBeCloseTo(-10, 1);
  });

  it("treats BUY_LIMIT the same as BUY and SELL_LIMIT the same as SELL", () => {
    expect(computeFloatingPips("EURUSD", "BUY_LIMIT", 1.085, 1.0865)).toBeCloseTo(15, 1);
    expect(computeFloatingPips("EURUSD", "SELL_LIMIT", 1.085, 1.0835)).toBeCloseTo(15, 1);
  });

  it("uses gold's point size (not forex pip size) for XAUUSD", () => {
    // Gold pipSize is 0.1, so a $2 move is 20 points.
    const pips = computeFloatingPips("XAUUSD", "BUY", 2345.5, 2347.5);
    expect(pips).toBeCloseTo(20, 1);
  });

  it("returns null for a pair that isn't in the watchlist", () => {
    expect(computeFloatingPips("NZDCHF", "BUY", 1, 1.001)).toBeNull();
  });

  it("returns 0 when price hasn't moved from entry", () => {
    expect(computeFloatingPips("EURUSD", "BUY", 1.085, 1.085)).toBe(0);
  });
});
