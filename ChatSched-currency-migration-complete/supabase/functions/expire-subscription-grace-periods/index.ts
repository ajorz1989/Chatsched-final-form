// Scheduled job — closes out subscriptions that have sat in 'grace_period'
// past SUBSCRIPTION_GRACE_PERIOD_DAYS, moving them to 'suspended' and, for
// businesses, forfeiting whatever launch credit they had left. Does for
// the subscription lifecycle exactly what expire-channel-requests already
// does for stale channel_requests rows — the same "no cron, admin is the
// safety net at pilot volume" gap PHASE2_SUBSCRIPTIONS_DELIVERY.md left
// open, closed the same way that one was later closed (see
// schema_phase32_expire_channel_requests.sql).
//
// 'grace_period' itself is entered by payfast-notify's FAILED branches
// (business and publisher), not by this function — this function only
// ever handles the one exit from it. See
// supabase/functions/_shared/subscriptionLapseDecision.ts for the shared
// decision logic (nextStatusOnFailedPayment, isGracePeriodExpired,
// SUBSCRIPTION_GRACE_PERIOD_DAYS) both that file and this one rely on.
//
// Not user-facing — invoked on a schedule, not by someone logged in. Same
// shared-secret auth as expire-channel-requests and payfast-notify: no
// Supabase user JWT to check when nobody's logged in when this runs.
// Deploy with --no-verify-jwt. See "Scheduled subscription grace-period
// expiry" in supabase/DEPLOY.md for the exact cron.schedule(...) command.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { forfeitBusinessLaunchCredit } from "../_shared/launchCredit.ts";
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from "../_shared/subscriptionLapseDecision.ts";
import { notifySubscriptionLapse } from "../_shared/notifySubscriptionLapse.ts";

Deno.serve(async (req) => {
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Same boundary isGracePeriodExpired treats as expired: a subscription
    // whose grace_period_started_at is at or before this cutoff has been
    // in grace_period for at least SUBSCRIPTION_GRACE_PERIOD_DAYS.
    const cutoffIso = new Date(Date.now() - SUBSCRIPTION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const { data: expiredBusiness, error: businessError } = await admin
      .from("business_subscriptions")
      .update({ status: "suspended", grace_period_started_at: null, updated_at: nowIso })
      .eq("status", "grace_period")
      .lte("grace_period_started_at", cutoffIso)
      .select("id, business_id");
    if (businessError) throw businessError;

    // Publisher subscriptions have no launch credit to forfeit, but the
    // same clock and the same suspension apply.
    const { data: expiredPublisher, error: publisherError } = await admin
      .from("publisher_subscriptions")
      .update({ status: "suspended", grace_period_started_at: null, updated_at: nowIso })
      .eq("status", "grace_period")
      .lte("grace_period_started_at", cutoffIso)
      .select("id, publisher_id");
    if (publisherError) throw publisherError;

    // Best-effort, one at a time rather than Promise.all — a forfeiture
    // failure logs and moves on (forfeitBusinessLaunchCredit already does
    // this internally) rather than risking partial completion under
    // concurrent updates to the same business_launch_credits row.
    for (const row of (expiredBusiness ?? []) as { id: string; business_id: string }[]) {
      await forfeitBusinessLaunchCredit(admin, row.business_id);
    }

    // Same "was previously silent" gap as payfast-notify's grace_period
    // entry (see subscriptionLapseEmail.ts's file comment) — a suspension
    // is the other half of it. Best-effort and after every status/credit
    // change above has already committed, same posture as
    // expire-channel-requests' own notifyBusiness: a failed email should
    // never look like the suspension itself failed.
    await Promise.all([
      ...((expiredBusiness ?? []) as { id: string; business_id: string }[]).map((row) =>
        notifySubscriptionLapse(admin, row.business_id, "business", "suspended").catch((err) =>
          console.error("expire-subscription-grace-periods: notify failed", row.id, err)
        )
      ),
      ...((expiredPublisher ?? []) as { id: string; publisher_id: string }[]).map((row) =>
        notifySubscriptionLapse(admin, row.publisher_id, "publisher", "suspended").catch((err) =>
          console.error("expire-subscription-grace-periods: notify failed", row.id, err)
        )
      ),
    ]);

    return json({
      suspended_business: expiredBusiness?.length ?? 0,
      suspended_publisher: expiredPublisher?.length ?? 0,
    });
  } catch (err) {
    console.error("expire-subscription-grace-periods: unexpected error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
