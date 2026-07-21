import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker, exponentialBackoff } from "@/lib/marketData/circuitBreaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts closed and allows attempts", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
    expect(cb.getState()).toBe("closed");
    expect(cb.canAttempt()).toBe(true);
  });

  it("stays closed for failures below the threshold", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe("closed");
    expect(cb.canAttempt()).toBe(true);
  });

  it("opens after reaching the failure threshold, blocking further attempts", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe("open");
    expect(cb.canAttempt()).toBe(false);
  });

  it("a success resets consecutive failures and closes the circuit", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
    cb.onFailure();
    cb.onFailure();
    cb.onSuccess();
    expect(cb.getState()).toBe("closed");
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it("moves to half-open and allows exactly one attempt after the cooldown elapses", () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
    cb.onFailure();
    cb.onFailure();
    expect(cb.canAttempt()).toBe(false);

    vi.advanceTimersByTime(5001);

    expect(cb.canAttempt()).toBe(true);
    expect(cb.getState()).toBe("half_open");
  });

  it("a failure while half-open re-opens the circuit and restarts the cooldown", () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
    cb.onFailure();
    cb.onFailure();
    vi.advanceTimersByTime(5001);
    cb.canAttempt(); // transitions to half-open
    cb.onFailure();

    expect(cb.getState()).toBe("open");
    expect(cb.canAttempt()).toBe(false); // fresh cooldown, not yet elapsed
  });

  it("a success while half-open fully closes the circuit", () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
    cb.onFailure();
    cb.onFailure();
    vi.advanceTimersByTime(5001);
    cb.canAttempt();
    cb.onSuccess();

    expect(cb.getState()).toBe("closed");
    cb.onFailure();
    expect(cb.getState()).toBe("closed"); // back to normal threshold counting, not immediately open
  });

  it("reports remaining cooldown time while open", () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
    cb.onFailure();
    expect(cb.getCooldownRemainingMs()).toBeGreaterThan(9000);
    vi.advanceTimersByTime(4000);
    expect(cb.getCooldownRemainingMs()).toBeLessThanOrEqual(6000);
  });

  it("reset() returns the breaker to a fresh closed state", () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
    cb.onFailure();
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
    expect(cb.getConsecutiveFailures()).toBe(0);
    expect(cb.canAttempt()).toBe(true);
  });
});

describe("exponentialBackoff", () => {
  it("grows exponentially with attempt number", () => {
    const d0 = exponentialBackoff(0, 1000, 60_000);
    const d1 = exponentialBackoff(1, 1000, 60_000);
    const d2 = exponentialBackoff(2, 1000, 60_000);
    expect(d1).toBeGreaterThan(d0 * 1.5);
    expect(d2).toBeGreaterThan(d1 * 1.5);
  });

  it("never exceeds the configured max, even at a high attempt count", () => {
    const d = exponentialBackoff(20, 1000, 30_000);
    expect(d).toBeLessThanOrEqual(30_000);
  });

  it("stays within a sane jitter band around the base for attempt 0", () => {
    const d = exponentialBackoff(0, 1000, 30_000);
    expect(d).toBeGreaterThanOrEqual(800);
    expect(d).toBeLessThanOrEqual(1100);
  });
});
