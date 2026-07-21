export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens and blocks further attempts. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing a single trial attempt (half-open). */
  cooldownMs: number;
}

/**
 * A standard closed → open → half-open → closed circuit breaker.
 *
 * - CLOSED: normal operation, attempts are allowed. Failures accumulate.
 * - OPEN: too many consecutive failures — attempts are blocked entirely
 *   until the cooldown elapses. This is what actually prevents a tight
 *   reconnect loop from hammering a down/misbehaving upstream.
 * - HALF_OPEN: cooldown elapsed, exactly one trial attempt is allowed. A
 *   success closes the circuit (back to normal); a failure re-opens it
 *   and restarts the cooldown.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  /** Call before attempting an operation. Returns false if the circuit is open and the cooldown hasn't elapsed. */
  canAttempt(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.options.cooldownMs) {
        this.state = "half_open";
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
  }

  onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "half_open" || this.consecutiveFailures >= this.options.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  getCooldownRemainingMs(): number {
    if (this.state !== "open") return 0;
    return Math.max(0, this.options.cooldownMs - (Date.now() - this.openedAt));
  }

  /** Resets to a fresh closed state — used on explicit provider stop/restart. */
  reset(): void {
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.openedAt = 0;
  }
}

/** Exponential backoff with jitter, capped at maxMs. attempt is 0-indexed. */
export function exponentialBackoff(attempt: number, baseMs: number, maxMs: number): number {
  const raw = baseMs * 2 ** attempt;
  const capped = Math.min(raw, maxMs);
  const jitterBand = capped * 0.1; // ±10%
  const jittered = capped - jitterBand + Math.random() * (2 * jitterBand);
  return Math.round(Math.min(Math.max(jittered, 0), maxMs));
}
