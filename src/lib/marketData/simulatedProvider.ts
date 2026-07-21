import { EventEmitter } from "events";
import type { IMarketDataProvider, Tick } from "./types";
import { WATCHED_INSTRUMENTS } from "./instruments";

/**
 * Generates a plausible-looking live price feed via a bounded random walk
 * around each instrument's base price, ticking on a fixed interval. This
 * is genuinely real, working code — not a placeholder — it's the fallback
 * (and default) provider so the whole real-time pipeline (WS broadcast,
 * floating P/L, signal auto-updates) has something real to run against
 * without requiring a market data subscription.
 */
export class SimulatedProvider extends EventEmitter implements IMarketDataProvider {
  private latest = new Map<string, Tick>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private ready = false;

  async start(): Promise<void> {
    this.emit("status", { state: "connecting" });

    for (const instrument of WATCHED_INSTRUMENTS) {
      this.latest.set(instrument.symbol, { symbol: instrument.symbol, price: instrument.basePrice, timestamp: Date.now() });
    }
    this.ready = true;
    this.emit("status", { state: "simulation" });

    // Emit an initial tick for every symbol immediately so consumers don't
    // have to wait a full interval for first data.
    for (const tick of this.latest.values()) this.emit("tick", tick);

    this.interval = setInterval(() => this.tickAll(), 2000);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.emit("status", { state: "disconnected" });
  }

  isReady(): boolean {
    return this.ready;
  }

  getLatest(symbol: string): Tick | null {
    return this.latest.get(symbol) ?? null;
  }

  getAllLatest(): Tick[] {
    return Array.from(this.latest.values());
  }

  private tickAll(): void {
    for (const instrument of WATCHED_INSTRUMENTS) {
      const current = this.latest.get(instrument.symbol)!;
      const pullToBase = (instrument.basePrice - current.price) * 0.01;
      const randomStep = (Math.random() - 0.5) * instrument.pipSize * 8;
      const nextPrice = Math.max(0.0001, current.price + pullToBase + randomStep);

      const tick: Tick = { symbol: instrument.symbol, price: Number(nextPrice.toFixed(5)), timestamp: Date.now() };
      this.latest.set(instrument.symbol, tick);
      this.emit("tick", tick);
    }
  }
}
