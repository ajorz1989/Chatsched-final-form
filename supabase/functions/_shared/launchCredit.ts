// Forfeits whatever launch credit a business has left, the moment their
// ChatSched Business subscription reaches 'cancelled' or 'suspended'.
// Product decision, not an engineering default: the credit was a welcome
// incentive tied to being a paying subscriber, not money that outlives
// the subscription. Confirmed directly rather than assumed — see
// PHASE20's delivery notes for how this was raised and decided.
//
// Deliberately NOT called for 'past_due' or 'grace_period' — both are
// still recoverable states (isSubscriptionUsable-adjacent: PayFast is
// still retrying, or the grace window hasn't closed yet), and zeroing
// credit out during either would be a harsher read of "lapsed" than what
// was actually agreed. Only 'cancelled' and 'suspended' forfeit — see
// shouldForfeitLaunchCredit in subscriptionLapseDecision.ts, which
// payfast-notify and expire-subscription-grace-periods check before
// calling this; cancel-subscription doesn't need the check since it only
// ever forfeits for the one status it itself just set ('cancelled').
//
// deno-lint-ignore no-explicit-any
export async function forfeitBusinessLaunchCredit(admin: any, businessId: string): Promise<void> {
  const { data: credit, error } = await admin
    .from("business_launch_credits")
    .select("id, remaining")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error("forfeitBusinessLaunchCredit: lookup failed", { businessId, error });
    return;
  }
  // No row (never earned a first-payment credit yet) or already at zero
  // (already forfeited, or fully spent) — nothing to do either way. Not
  // an error case, just a no-op.
  if (!credit || Number(credit.remaining) <= 0) return;

  const { error: updateError } = await admin
    .from("business_launch_credits")
    .update({ remaining: 0, updated_at: new Date().toISOString() })
    .eq("id", credit.id);

  if (updateError) {
    console.error("forfeitBusinessLaunchCredit: update failed", { businessId, error: updateError });
  }
}

// 'suspended' is defined in schema_phase55's check constraint, and as of
// PHASE23 something actually sets it: expire-subscription-grace-periods,
// a scheduled Edge Function that moves a business_subscriptions row from
// 'grace_period' to 'suspended' once grace_period_started_at
// (schema_phase72) is older than SUBSCRIPTION_GRACE_PERIOD_DAYS
// (subscriptionLapseDecision.ts). It calls forfeitBusinessLaunchCredit
// the same way cancel-subscription and payfast-notify do above — this
// comment stays as a pointer for whoever next touches any of the three,
// so the forfeiture call doesn't quietly diverge between them.
