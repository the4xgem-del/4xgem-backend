"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const circuitBreaker_1 = require("../../lib/marketData/circuitBreaker");
(0, vitest_1.describe)("CircuitBreaker", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)("starts closed and allows attempts", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
        (0, vitest_1.expect)(cb.getState()).toBe("closed");
        (0, vitest_1.expect)(cb.canAttempt()).toBe(true);
    });
    (0, vitest_1.it)("stays closed for failures below the threshold", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
        cb.onFailure();
        cb.onFailure();
        (0, vitest_1.expect)(cb.getState()).toBe("closed");
        (0, vitest_1.expect)(cb.canAttempt()).toBe(true);
    });
    (0, vitest_1.it)("opens after reaching the failure threshold, blocking further attempts", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
        cb.onFailure();
        cb.onFailure();
        cb.onFailure();
        (0, vitest_1.expect)(cb.getState()).toBe("open");
        (0, vitest_1.expect)(cb.canAttempt()).toBe(false);
    });
    (0, vitest_1.it)("a success resets consecutive failures and closes the circuit", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 3, cooldownMs: 10_000 });
        cb.onFailure();
        cb.onFailure();
        cb.onSuccess();
        (0, vitest_1.expect)(cb.getState()).toBe("closed");
        (0, vitest_1.expect)(cb.getConsecutiveFailures()).toBe(0);
    });
    (0, vitest_1.it)("moves to half-open and allows exactly one attempt after the cooldown elapses", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
        cb.onFailure();
        cb.onFailure();
        (0, vitest_1.expect)(cb.canAttempt()).toBe(false);
        vitest_1.vi.advanceTimersByTime(5001);
        (0, vitest_1.expect)(cb.canAttempt()).toBe(true);
        (0, vitest_1.expect)(cb.getState()).toBe("half_open");
    });
    (0, vitest_1.it)("a failure while half-open re-opens the circuit and restarts the cooldown", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
        cb.onFailure();
        cb.onFailure();
        vitest_1.vi.advanceTimersByTime(5001);
        cb.canAttempt(); // transitions to half-open
        cb.onFailure();
        (0, vitest_1.expect)(cb.getState()).toBe("open");
        (0, vitest_1.expect)(cb.canAttempt()).toBe(false); // fresh cooldown, not yet elapsed
    });
    (0, vitest_1.it)("a success while half-open fully closes the circuit", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
        cb.onFailure();
        cb.onFailure();
        vitest_1.vi.advanceTimersByTime(5001);
        cb.canAttempt();
        cb.onSuccess();
        (0, vitest_1.expect)(cb.getState()).toBe("closed");
        cb.onFailure();
        (0, vitest_1.expect)(cb.getState()).toBe("closed"); // back to normal threshold counting, not immediately open
    });
    (0, vitest_1.it)("reports remaining cooldown time while open", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
        cb.onFailure();
        (0, vitest_1.expect)(cb.getCooldownRemainingMs()).toBeGreaterThan(9000);
        vitest_1.vi.advanceTimersByTime(4000);
        (0, vitest_1.expect)(cb.getCooldownRemainingMs()).toBeLessThanOrEqual(6000);
    });
    (0, vitest_1.it)("reset() returns the breaker to a fresh closed state", () => {
        const cb = new circuitBreaker_1.CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000 });
        cb.onFailure();
        (0, vitest_1.expect)(cb.getState()).toBe("open");
        cb.reset();
        (0, vitest_1.expect)(cb.getState()).toBe("closed");
        (0, vitest_1.expect)(cb.getConsecutiveFailures()).toBe(0);
        (0, vitest_1.expect)(cb.canAttempt()).toBe(true);
    });
});
(0, vitest_1.describe)("exponentialBackoff", () => {
    (0, vitest_1.it)("grows exponentially with attempt number", () => {
        const d0 = (0, circuitBreaker_1.exponentialBackoff)(0, 1000, 60_000);
        const d1 = (0, circuitBreaker_1.exponentialBackoff)(1, 1000, 60_000);
        const d2 = (0, circuitBreaker_1.exponentialBackoff)(2, 1000, 60_000);
        (0, vitest_1.expect)(d1).toBeGreaterThan(d0 * 1.5);
        (0, vitest_1.expect)(d2).toBeGreaterThan(d1 * 1.5);
    });
    (0, vitest_1.it)("never exceeds the configured max, even at a high attempt count", () => {
        const d = (0, circuitBreaker_1.exponentialBackoff)(20, 1000, 30_000);
        (0, vitest_1.expect)(d).toBeLessThanOrEqual(30_000);
    });
    (0, vitest_1.it)("stays within a sane jitter band around the base for attempt 0", () => {
        const d = (0, circuitBreaker_1.exponentialBackoff)(0, 1000, 30_000);
        (0, vitest_1.expect)(d).toBeGreaterThanOrEqual(800);
        (0, vitest_1.expect)(d).toBeLessThanOrEqual(1100);
    });
});
//# sourceMappingURL=circuitBreaker.test.js.map