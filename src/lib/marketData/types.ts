import { EventEmitter } from "events";

export interface Tick {
  symbol: string; // e.g. "EUR/USD", "XAU/USD", "BTC/USD"
  price: number;
  timestamp: number; // ms epoch
}

/**
 * The four externally-reported health states this whole system reduces to:
 * Connected (streaming or polling real data), Reconnecting (a real provider
 * recovering from a dropped connection), Disconnected (gave up — circuit
 * breaker open, or never started), and Simulation (intentionally running
 * fake data, e.g. local dev with no API key).
 *
 * This is an additive extension of the original three-state union — every
 * existing case is still valid, callers that only handled the original
 * three states simply won't see the new ones unless they ask. The
 * IMarketDataProvider interface itself (its methods and event names) is
 * unchanged; only the data shape of the existing "status" event is richer.
 */
export type ProviderStatus =
  | { state: "connecting" }
  | { state: "streaming"; mode: "websocket" | "polling" }
  | { state: "reconnecting"; attempt: number; nextRetryMs: number; reason?: string }
  | { state: "disconnected"; reason?: string; circuitOpen?: boolean }
  | { state: "simulation" };

/**
 * Contract every market data source must implement. The rest of the
 * application — the WebSocket broadcaster, the signal auto-update watcher,
 * the REST snapshot endpoint — depends ONLY on this interface, never on a
 * concrete provider class. That's what lets a new provider (a different
 * vendor, a broker feed, whatever) be added later by writing one new class
 * and touching the factory in `index.ts`, with zero changes to business
 * logic anywhere else.
 */
export interface IMarketDataProvider extends EventEmitter {
  start(): Promise<void>;
  stop(): void;
  /** True once at least one tick has been received (or synthesized) for the watchlist. */
  isReady(): boolean;
  getLatest(symbol: string): Tick | null;
  getAllLatest(): Tick[];

  on(event: "tick", listener: (tick: Tick) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "status", listener: (status: ProviderStatus) => void): this;
}
