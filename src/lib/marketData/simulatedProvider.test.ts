import { describe, it, expect, afterEach } from "vitest";
import { SimulatedProvider } from "@/lib/marketData/simulatedProvider";
import { WATCHED_INSTRUMENTS } from "@/lib/marketData/instruments";

describe("SimulatedProvider", () => {
  let provider: SimulatedProvider;

  afterEach(() => {
    provider?.stop();
  });

  it("is not ready before start() is called", () => {
    provider = new SimulatedProvider();
    expect(provider.isReady()).toBe(false);
    expect(provider.getAllLatest()).toHaveLength(0);
  });

  it("becomes ready and emits an initial tick for every watched instrument on start()", async () => {
    provider = new SimulatedProvider();
    const seen = new Set<string>();
    provider.on("tick", (tick) => seen.add(tick.symbol));

    await provider.start();

    expect(provider.isReady()).toBe(true);
    for (const instrument of WATCHED_INSTRUMENTS) {
      expect(seen.has(instrument.symbol)).toBe(true);
    }
  });

  it("getLatest returns the instrument's exact base price immediately after start", async () => {
    provider = new SimulatedProvider();
    await provider.start();

    const gold = provider.getLatest("XAU/USD");
    expect(gold).not.toBeNull();
    const goldInstrument = WATCHED_INSTRUMENTS.find((i) => i.symbol === "XAU/USD")!;
    expect(gold!.price).toBe(goldInstrument.basePrice);
  });

  it("emits subsequent ticks with plausible, bounded price movement", async () => {
    provider = new SimulatedProvider();
    await provider.start();

    const btcTicks: number[] = [];
    provider.on("tick", (tick) => {
      if (tick.symbol === "BTC/USD") btcTicks.push(tick.price);
    });

    await new Promise((resolve) => setTimeout(resolve, 2200));

    expect(btcTicks.length).toBeGreaterThan(0);
    const btcInstrument = WATCHED_INSTRUMENTS.find((i) => i.symbol === "BTC/USD")!;
    for (const price of btcTicks) {
      expect(Math.abs(price - btcInstrument.basePrice)).toBeLessThan(btcInstrument.basePrice * 0.05);
    }
  }, 5000);

  it("stop() halts further ticking", async () => {
    provider = new SimulatedProvider();
    await provider.start();
    provider.stop();

    let tickedAfterStop = false;
    provider.on("tick", () => {
      tickedAfterStop = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 2200));
    expect(tickedAfterStop).toBe(false);
  }, 5000);
});
