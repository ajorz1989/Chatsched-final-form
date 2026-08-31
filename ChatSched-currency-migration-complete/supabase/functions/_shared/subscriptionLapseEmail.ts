// Pure email-content builder for the two subscription-lifecycle emails
// PHASE23 left unsent. PHASE23_SUBSCRIPTION_GRACE_PERIOD_DELIVERY.md's own
// "Not done" list named this gap explicitly, and it was carried forward
// as CLAUDE_3.0.md's "Moving forward" item 1: payfast-notify and
// expire-subscription-grace-periods both change a subscription's status
// today (active -> past_due -> grace_period -> suspended) without ever
// telling the account holder, unlike expire-channel-requests, which
// already emails on every status change it makes. Someone whose
// subscription lapses finds out only by logging in and noticing a badge
// changed color.
//
// Kept separate from the actual send (supabase/functions/_shared/resend.ts)
// and from the actual status-transition logic
// (subscriptionLapseDecision.ts) for the same reason those two are
// already split from payfast-notify/index.ts: this can be unit-tested
// directly under vitest; a Deno.serve-based file with a live fetch() call
// can't.
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from "./subscriptionLapseDecision.ts";

export type SubscriptionAccountType = "business" | "publisher";
export type SubscriptionLapseEvent = "grace_period" | "suspended";

/**
 * Builds the subject/html for one subscription-lapse email.
 *
 * `event` is which transition just happened — 'grace_period' (a second
 * consecutive failed payment, per nextStatusOnFailedPayment) or
 * 'suspended' (the grace period ran out, per isGracePeriodExpired). Only
 * these two: 'past_due' (the first failed payment) is deliberately silent,
 * same as it already was — the whole design of a grace period is that
 * PayFast's own automatic retry gets a first chance to just fix it, and an
 * email on every single failed charge attempt would train people to
 * ignore this one. 'cancelled' (an explicit, self-directed action via
 * cancel-subscription, or a PayFast-side cancellation) already isn't
 * silent in the way this gap was — the account holder was either the one
 * who clicked cancel, or acted directly on PayFast's own site, so a
 * confirmation from them isn't the same missing-context problem a passive
 * lapse is. Not extending this module to cover it since nothing asked for
 * that and it isn't the gap that was flagged.
 *
 * `accountType` only changes the plan name and whether launch-credit
 * wording appears — publishers never had launch credit
 * (business_launch_credits is business-only, schema_phase55) to lose.
 */
export function buildSubscriptionLapseEmail(
  event: SubscriptionLapseEvent,
  accountType: SubscriptionAccountType,
  siteUrl: string
): { subject: string; html: string } {
  const plan = accountType === "business" ? "ChatSched Business" : "ChatSched Publisher Network";
  const manageLink = siteUrl ? `<p><a href="${siteUrl}/account">Manage your subscription</a></p>` : "";

  const creditNote =
    accountType === "business"
      ? event === "grace_period"
        ? ` Your launch credit is still safe for now, but it will be forfeited if this isn't sorted out before the grace period ends.`
        : ` Any launch credit you had left has been forfeited, as it always is once a subscription lapses this far.`
      : "";

  if (event === "grace_period") {
    return {
      subject: `Action needed: your ${plan} payment failed`,
      html:
        `<p>We weren't able to process your latest <strong>${escapeHtml(plan)}</strong> payment, even after a retry.</p>` +
        `<p>Your account is now in a grace period — everything still works for now, but it will be suspended in ` +
        `${SUBSCRIPTION_GRACE_PERIOD_DAYS} days if this isn't resolved.${creditNote}</p>` +
        manageLink,
    };
  }

  return {
    subject: `Your ${plan} subscription has been suspended`,
    html:
      `<p>Your <strong>${escapeHtml(plan)}</strong> subscription has been suspended after payment couldn't be ` +
      `completed during the grace period.${creditNote}</p>` +
      `<p>You're welcome to resubscribe at any time to restore access.</p>` +
      manageLink,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
