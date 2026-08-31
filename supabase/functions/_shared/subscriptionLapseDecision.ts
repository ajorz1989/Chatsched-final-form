// Pure decision logic pulled out of payfast-notify's
// handleBusinessSubscriptionItn and handlePublisherSubscriptionItn (their
// FAILED and CANCELLED branches), plus the grace-period-expiry decision
// used by expire-subscription-grace-periods. All of it lives here instead
// of in payfast-notify/index.ts so it can actually be unit-tested — that
// file runs `Deno.serve(...)` at module scope and imports from a remote
// esm.sh URL, both of which fail immediately if the file is loaded under
// vitest/Node.
//
// Shared between business and publisher subscriptions: both tables use
// the identical status set (schema_phase55) and, as of schema_phase72,
// the identical grace_period_started_at column. Publisher subscriptions
// just never call shouldForfeitLaunchCredit, since publishers have no
// launch credit to forfeit.

export type SubscriptionLifecycleStatus =
  | "pending"
  | "active"
  | "past_due"
  | "grace_period"
  | "cancelled"
  | "suspended";

/** How long a subscription sits in `grace_period` before
 * expire-subscription-grace-periods moves it on to `suspended`.
 *
 * Not confirmed product policy — neither the original brief nor this
 * codebase states a grace-period length anywhere authoritative (see
 * PHASE2_SUBSCRIPTIONS_DELIVERY.md's own note declining to invent one).
 * 7 days follows this codebase's existing precedent for an analogous
 * "how long do we wait before an unresolved state auto-closes" decision
 * — channel_requests' approval_due_at/payment_due_at windows
 * (schema_phase17_channel_marketplace.sql, automated in
 * schema_phase32_expire_channel_requests.sql) are also 7 days. Treat
 * this as a reasonable placeholder to confirm, not a settled answer. */
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;

/**
 * What a FAILED ITN should move a subscription to.
 *
 * 'active' can still recover — PayFast keeps retrying a failed renewal —
 * so this is 'past_due', not a lapse yet. A subscription already
 * 'past_due' failing again has now missed its retry too, so it moves
 * into 'grace_period': still usable (see isSubscriptionUsable in
 * src/lib/subscriptions.ts), but now on the clock
 * expire-subscription-grace-periods enforces. A subscription already IN
 * 'grace_period' that fails yet another retry stays in 'grace_period' —
 * that state's exit is owned by the scheduled expiry job checking
 * grace_period_started_at, not by however many times PayFast happens to
 * retry before the window closes; letting a FAILED ITN also cancel it
 * early would make the grace period meaningless. Any other current
 * status (most commonly 'pending' — the very first payment on a new
 * subscription failing) was never active in the first place, so there's
 * nothing to retry toward — straight to 'cancelled'.
 */
export function nextStatusOnFailedPayment(
  currentStatus: SubscriptionLifecycleStatus
): "past_due" | "grace_period" | "cancelled" {
  if (currentStatus === "active") return "past_due";
  if (currentStatus === "past_due") return "grace_period";
  if (currentStatus === "grace_period") return "grace_period";
  return "cancelled";
}

/**
 * Whether a business's launch credit should be forfeited for a
 * subscription that just moved to `status`.
 *
 * Only 'cancelled' and 'suspended' forfeit. 'past_due' and 'grace_period'
 * deliberately do not: both are still recoverable states — the whole
 * point of a grace period is that it isn't a punishment yet — so zeroing
 * credit out during either would be a harsher read of "lapsed" than
 * what a grace period is supposed to mean.
 */
export function shouldForfeitLaunchCredit(status: SubscriptionLifecycleStatus): boolean {
  return status === "cancelled" || status === "suspended";
}

/**
 * Whether a subscription that entered `grace_period` at
 * `gracePeriodStartedAt` has been there long enough for
 * expire-subscription-grace-periods to move it on to `suspended`.
 *
 * `gracePeriodStartedAt` is whatever came out of the
 * grace_period_started_at column — null for a subscription that was
 * never in (or already left) grace_period, in which case this is always
 * false rather than throwing on an unparsable date.
 */
export function isGracePeriodExpired(
  gracePeriodStartedAt: string | null,
  now: Date = new Date(),
  graceDays: number = SUBSCRIPTION_GRACE_PERIOD_DAYS
): boolean {
  if (!gracePeriodStartedAt) return false;
  const started = new Date(gracePeriodStartedAt);
  if (Number.isNaN(started.getTime())) return false;
  const deadline = new Date(started.getTime() + graceDays * 24 * 60 * 60 * 1000);
  return now.getTime() >= deadline.getTime();
}
