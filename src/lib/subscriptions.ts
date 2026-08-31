/**
 * Shared logic for the ChatSched Publisher Network (R99/mo) and ChatSched
 * Business (R199/mo + launch credit) subscriptions — status labels and the
 * launch-credit-application math, kept here as pure functions so they're
 * testable without a live Supabase connection. The actual state (what a
 * subscription's status is right now) lives in publisher_subscriptions /
 * business_subscriptions (schema_phase55) and is only ever written by
 * publisher-subscribe, business-subscribe, and payfast-notify.
 */

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "grace_period"
  | "suspended"
  | "cancelled";

export interface SubscriptionStatusInfo {
  label: string;
  /** Rough traffic-light for styling — not a fourth data source. */
  tone: "positive" | "warning" | "negative" | "neutral";
}

const STATUS_INFO: Record<SubscriptionStatus, SubscriptionStatusInfo> = {
  pending: { label: "Payment pending", tone: "neutral" },
  active: { label: "Active", tone: "positive" },
  past_due: { label: "Payment failed — retrying", tone: "warning" },
  grace_period: { label: "Grace period", tone: "warning" },
  suspended: { label: "Suspended", tone: "negative" },
  cancelled: { label: "Cancelled", tone: "negative" },
};

export function subscriptionStatusInfo(status: SubscriptionStatus): SubscriptionStatusInfo {
  return STATUS_INFO[status];
}

/** True for any status where the subscriber should still have full access. */
export function isSubscriptionUsable(status: SubscriptionStatus): boolean {
  return status === "active" || status === "grace_period";
}

/**
 * How much of a campaign's amount should be covered by launch credit, and
 * what's left for PayFast to actually charge. Never applies more credit
 * than either the campaign costs or the business has remaining — the
 * campaign amount is always the tighter cap, so a partially-used credit
 * carries the rest forward rather than being lost.
 */
export interface CreditApplication {
  creditApplied: number;
  amountDue: number;
}

export function applyLaunchCredit(campaignAmount: number, availableCredit: number): CreditApplication {
  const safeAmount = Math.max(0, campaignAmount);
  const safeCredit = Math.max(0, availableCredit);
  const creditApplied = Math.round(Math.min(safeAmount, safeCredit) * 100) / 100;
  const amountDue = Math.round((safeAmount - creditApplied) * 100) / 100;
  return { creditApplied, amountDue };
}
