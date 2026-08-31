import { describe, it, expect } from "vitest";
import {
  nextStatusOnFailedPayment,
  shouldForfeitLaunchCredit,
  isGracePeriodExpired,
  SUBSCRIPTION_GRACE_PERIOD_DAYS,
} from "./subscriptionLapseDecision";

// PHASE20_LAUNCH_CREDIT_FORFEITURE_DELIVERY.md flagged "no
// grace-period-expiry job exists yet" as still open. PHASE23 built it,
// which meant first making 'grace_period' a state anything actually
// enters — these three functions are the decisions that make the whole
// pending -> active -> past_due -> grace_period -> suspended lifecycle
// (or -> cancelled on explicit cancellation) actually work end to end.

describe("nextStatusOnFailedPayment", () => {
  it("moves an active subscription to past_due, not straight to a lapse state", () => {
    // A failed renewal on an active subscription is still recoverable —
    // PayFast keeps retrying — so this must not skip ahead.
    expect(nextStatusOnFailedPayment("active")).toBe("past_due");
  });

  it("moves a past_due subscription into grace_period on a further failure", () => {
    expect(nextStatusOnFailedPayment("past_due")).toBe("grace_period");
  });

  it("keeps a subscription already in grace_period in grace_period on yet another failure", () => {
    // The scheduled expiry job owns this state's exit, not the count of
    // failed retries — otherwise the grace period is meaningless for
    // anyone PayFast happens to retry more than once during it.
    expect(nextStatusOnFailedPayment("grace_period")).toBe("grace_period");
  });

  it("moves a pending subscription (never activated) straight to cancelled", () => {
    // A first payment that fails was never active — there's no
    // recoverable period to fall back into.
    expect(nextStatusOnFailedPayment("pending")).toBe("cancelled");
  });

  it("moves an already-cancelled or suspended subscription to cancelled (no-op in practice)", () => {
    expect(nextStatusOnFailedPayment("cancelled")).toBe("cancelled");
    expect(nextStatusOnFailedPayment("suspended")).toBe("cancelled");
  });
});

describe("shouldForfeitLaunchCredit", () => {
  it("forfeits on cancelled", () => {
    expect(shouldForfeitLaunchCredit("cancelled")).toBe(true);
  });

  it("forfeits on suspended", () => {
    expect(shouldForfeitLaunchCredit("suspended")).toBe(true);
  });

  it("does not forfeit on past_due or grace_period — both are still recoverable", () => {
    expect(shouldForfeitLaunchCredit("past_due")).toBe(false);
    expect(shouldForfeitLaunchCredit("grace_period")).toBe(false);
  });

  it("does not forfeit on active or pending", () => {
    expect(shouldForfeitLaunchCredit("active")).toBe(false);
    expect(shouldForfeitLaunchCredit("pending")).toBe(false);
  });

  it("composes with nextStatusOnFailedPayment the same way payfast-notify's FAILED branch does", () => {
    // active -> past_due -> no forfeiture (still recoverable)
    expect(shouldForfeitLaunchCredit(nextStatusOnFailedPayment("active"))).toBe(false);
    // past_due -> grace_period -> still no forfeiture (that's the point
    // of a grace period)
    expect(shouldForfeitLaunchCredit(nextStatusOnFailedPayment("past_due"))).toBe(false);
    // pending (never activated) -> cancelled -> forfeits
    expect(shouldForfeitLaunchCredit(nextStatusOnFailedPayment("pending"))).toBe(true);
  });
});

describe("isGracePeriodExpired", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("is false for a subscription that was never in grace_period (null)", () => {
    expect(isGracePeriodExpired(null)).toBe(false);
  });

  it("is false for an unparsable timestamp rather than throwing", () => {
    expect(isGracePeriodExpired("not-a-real-date")).toBe(false);
  });

  it("is false right after entering grace_period", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    const startedAt = new Date(now.getTime() - 1 * DAY_MS).toISOString();
    expect(isGracePeriodExpired(startedAt, now)).toBe(false);
  });

  it("is false one day before the grace window closes", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    const startedAt = new Date(now.getTime() - (SUBSCRIPTION_GRACE_PERIOD_DAYS - 1) * DAY_MS).toISOString();
    expect(isGracePeriodExpired(startedAt, now)).toBe(false);
  });

  it("is true exactly at the grace window's boundary", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    const startedAt = new Date(now.getTime() - SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS).toISOString();
    expect(isGracePeriodExpired(startedAt, now)).toBe(true);
  });

  it("is true well past the grace window", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    const startedAt = new Date(now.getTime() - (SUBSCRIPTION_GRACE_PERIOD_DAYS + 3) * DAY_MS).toISOString();
    expect(isGracePeriodExpired(startedAt, now)).toBe(true);
  });

  it("respects a custom graceDays override", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    const startedAt = new Date(now.getTime() - 2 * DAY_MS).toISOString();
    expect(isGracePeriodExpired(startedAt, now, 1)).toBe(true);
    expect(isGracePeriodExpired(startedAt, now, 3)).toBe(false);
  });
});
