import { EventEmitter } from "events";
import WebSocket from "ws";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import type { IMarketDataProvider, ProviderStatus, Tick } from "./types";
import { WATCHED_INSTRUMENTS } from "./instruments";
import { CircuitBreaker, exponentialBackoff } from "./circuitBreaker";

const WS_URL = "wss://ws.twelvedata.com/v1/quotes/price";
const REST_BASE = "https://api.twelvedata.com/price";
const HEARTBEAT_INTERVAL_MS = 10_000;
const STALENESS_CHECK_INTERVAL_MS = 15_000;
/** No tick for this long on an ostensibly-open WS connection is treated as a dead ("zombie") connection. */
const STALE_THRESHOLD_MS = 45_000;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 60_000;

interface TwelveDataPriceEvent {
  event: "price";
  symbol: string;
  price: number;
  timestamp?: number;
}

interface TwelveDataSubscribeStatusEvent {
  event: "subscribe-status";
  status: "ok" | "error";
  success?: unknown[];
  fails?: unknown[];
}

/**
 * Streams real prices from Twelve Data (https://twelvedata.com). WebSocket
 * push streaming requires a Pro plan or above — on lower-tier keys the
 * subscribe call is rejected and this provider falls back to polling the
 * REST `/price` endpoint instead. Either way, callers see the same Tick
 * events through the unchanged IMarketDataProvider interface.
 *
 * Production hardening built in:
 *  - Exponential backoff with jitter between reconnect attempts.
 *  - A circuit breaker that stops retrying after repeated consecutive
 *    failures, instead of looping tightly against a down/misbehaving
 *    upstream, and automatically recovers once its cooldown elapses.
 *  - Staleness detection: an open socket that's gone quiet (no ticks and
 *    no heartbeat ack) for too long is treated as a dead connection and
 *    torn down/reconnected, protecting against zombie TCP connections.
 *  - Structured status events (connecting/streaming/reconnecting/
 *    disconnected) for every transition, and "error" events for dropped/
 *    malformed messages — both consumed by MarketDataMonitor.
 *
 * NOTE: built directly against Twelve Data's documented WebSocket message
 * format and REST contract, but could not be verified against their live
 * service in the environment this was built in (no outbound network access
 * to third-party APIs here, only package registries).
 */
export class TwelveDataProvider extends EventEmitter implements IMarketDataProvider {
  private latest = new Map<string, Tick>();
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stalenessTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mode: "websocket" | "polling" | null = null;
  private stopped = false;
  private reconnectAttempt = 0;
  private lastTickAt = 0;
  private pollingSymbols: string[] = [];
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    cooldownMs: CIRCUIT_COOLDOWN_MS,
  });

  async start(): Promise<void> {
    if (!env.TWELVE_DATA_API_KEY) {
      throw new Error("TWELVE_DATA_API_KEY is required when MARKET_DATA_PROVIDER=twelvedata");
    }
    this.stopped = false;
    this.circuitBreaker.reset();
    this.reconnectAttempt = 0;
    this.emitStatus({ state: "connecting" });
    this.connectWebSocket();
  }

  stop(): void {
    this.stopped = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.stalenessTimer) clearInterval(this.stalenessTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.emitStatus({ state: "disconnected", reason: "stopped" });
  }

  isReady(): boolean {
    return this.latest.size > 0;
  }

  getLatest(symbol: string): Tick | null {
    return this.latest.get(symbol) ?? null;
  }

  getAllLatest(): Tick[] {
    return Array.from(this.latest.values());
  }

  private emitStatus(status: ProviderStatus) {
    this.emit("status", status);
  }

  private connectWebSocket(): void {
    if (this.stopped) return;
    const url = `${WS_URL}?apikey=${env.TWELVE_DATA_API_KEY}`;
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      const symbols = WATCHED_INSTRUMENTS.map((i) => i.symbol).join(",");
      this.ws!.send(JSON.stringify({ action: "subscribe", params: { symbols } }));

      this.heartbeatTimer = setInterval(() => {
        this.ws?.send(JSON.stringify({ action: "heartbeat" }));
      }, HEARTBEAT_INTERVAL_MS);

      this.stalenessTimer = setInterval(() => this.checkStaleness(), STALENESS_CHECK_INTERVAL_MS);
    });

    this.ws.on("message", (raw) => {
      console.log("RAW WS:", JSON.parse(raw.toString()));
      let msg: TwelveDataPriceEvent | TwelveDataSubscribeStatusEvent;
      try {
        msg = JSON.parse(raw.toString());
      } catch (err) {
        this.emit(
          "error",
          new Error(`dropped_message: invalid JSON from Twelve Data WS (${(err as Error).message})`),
        );
        return;
      }

      if (msg.event === "subscribe-status") {
        console.log("SUBSCRIBE STATUS:", JSON.stringify(msg, null, 2));

        const failed = ((msg as any).fails ?? []) as Array<{ symbol: string }>;

        this.pollingSymbols = failed.map((f) => f.symbol);

        if (this.pollingSymbols.length > 0) {
          logger.warn(
            {
              symbols: this.pollingSymbols,
            },
            "Starting REST polling for unsupported symbols",
          );

          this.startPolling();
        }

        this.mode = "websocket";
        this.circuitBreaker.onSuccess();
        this.reconnectAttempt = 0;
        this.lastTickAt = Date.now();

        this.emitStatus({
          state: "streaming",
          mode: "websocket",
        });

        return;
      }
      // Price update
      if ((msg as any).event === "price") {
        const price = parseFloat((msg as any).price);

        if (!isNaN(price)) {
          this.lastTickAt = Date.now();

          const tick: Tick = {
            symbol: (msg as any).symbol,
            price,
            timestamp: Date.now(),
          };

          console.log("LIVE PRICE:", tick);

          this.latest.set(tick.symbol, tick);

          this.emit("tick", tick);

          return;
        }
      }

      // Anything else (unrecognized event type, price without a numeric value, etc.)
      // is a message we couldn't use — count it as dropped rather than silently ignoring it.
      this.emit("error", new Error(`dropped_message: unrecognized Twelve Data WS payload shape`));
    });

    this.ws.on("error", (err) => {
      logger.error({ err }, "Twelve Data WebSocket error");
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    });

    this.ws.on("close", () => {
      this.clearWsTimers();
      if (this.stopped || this.mode === "polling") return;
      this.scheduleReconnect("websocket closed");
    });
  }

  private clearWsTimers(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.stalenessTimer) clearInterval(this.stalenessTimer);
    this.heartbeatTimer = null;
    this.stalenessTimer = null;
  }

  /** Detects a zombie connection: socket reports open but no data (tick or subscribe-ack) has arrived in too long. */
  private checkStaleness(): void {
    if (this.stopped || !this.lastTickAt) return;
    const silentFor = Date.now() - this.lastTickAt;
    if (silentFor > STALE_THRESHOLD_MS) {
      logger.warn({ silentForMs: silentFor }, "Twelve Data WS connection appears stale — forcing reconnect");
      this.clearWsTimers();
      this.ws?.terminate();
      this.scheduleReconnect("stale connection (no data received)");
    }
  }

  private scheduleReconnect(reason: string): void {
    this.circuitBreaker.onFailure();

    if (!this.circuitBreaker.canAttempt()) {
      const cooldown = this.circuitBreaker.getCooldownRemainingMs();
      this.emitStatus({ state: "disconnected", reason, circuitOpen: true });
      logger.error(
        { reason, consecutiveFailures: this.circuitBreaker.getConsecutiveFailures(), cooldownMs: cooldown },
        "Market data circuit breaker opened — pausing reconnect attempts",
      );
      // Recheck after the cooldown; canAttempt() will flip us to half-open and this call retries exactly once.
      this.reconnectTimer = setTimeout(
        () => this.scheduleReconnect("circuit breaker cooldown elapsed"),
        cooldown + 100,
      );
      return;
    }

    const delay = exponentialBackoff(this.reconnectAttempt, BACKOFF_BASE_MS, BACKOFF_MAX_MS);
    this.reconnectAttempt += 1;
    this.emitStatus({ state: "reconnecting", attempt: this.reconnectAttempt, nextRetryMs: delay, reason });
    logger.info(
      { attempt: this.reconnectAttempt, delayMs: delay, reason },
      "Scheduling Twelve Data WS reconnect",
    );
    this.reconnectTimer = setTimeout(() => this.connectWebSocket(), delay);
  }

  private startPolling(): void {
    this.mode = "polling";
    this.circuitBreaker.onSuccess();
    this.emitStatus({ state: "streaming", mode: "polling" });
    const poll = () => void this.pollOnce();
    poll();
    this.pollTimer = setInterval(poll, env.MARKET_DATA_POLL_INTERVAL_MS);
  }

  private async pollOnce(): Promise<void> {
    try {
      const entries: [string, string | undefined][] = [];

      for (const symbol of this.pollingSymbols) {
        const url = `${REST_BASE}?symbol=${encodeURIComponent(symbol)}&apikey=${env.TWELVE_DATA_API_KEY}`;

        const res = await fetch(url);

        if (!res.ok) {
          console.log("REST FAILED:", symbol, res.status);
          continue;
        }
        const json = (await res.json()) as { price?: string };

        console.log("REST RESPONSE:", symbol, json);

        entries.push([symbol, json.price]);
      }

      let anyValid = false;
      for (const [symbol, priceStr] of entries) {
        if (!priceStr) continue;
        const price = parseFloat(priceStr);
        if (Number.isNaN(price)) {
          this.emit("error", new Error(`dropped_message: non-numeric price for ${symbol} in REST poll`));
          continue;
        }
        anyValid = true;
        this.lastTickAt = Date.now();
        const tick: Tick = { symbol, price, timestamp: Date.now() };
        console.log("REST PRICE:", tick);
        this.latest.set(symbol, tick);
        this.emit("tick", tick);
      }
      if (!anyValid) {
        this.emit("error", new Error("dropped_message: REST poll returned no usable prices"));
      }
    } catch (err) {
      logger.error({ err }, "Twelve Data REST poll failed");
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  }
}
