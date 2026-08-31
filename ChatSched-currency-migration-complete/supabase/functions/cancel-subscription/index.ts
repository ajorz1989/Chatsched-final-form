// Cancels a business or publisher subscription — sets status to
// 'cancelled' in ChatSched's own system AND calls PayFast's recurring-
// billing API to stop the underlying token from being charged again.
//
// ChatSched's own status always moves to 'cancelled' regardless of how the
// PayFast call goes — access is revoked either way, which matches the
// prior, smaller version of this function. What changed is that a stored
// payfast_token (schema_phase55) is now actually sent to PayFast's cancel
// endpoint via cancelPayfastSubscription (_shared/payfast.ts), instead of
// silently leaving the recurring token untouched.
//
// If that call fails — network error, PayFast-side error, token already
// cancelled there some other way — this still returns `cancelled: true`
// (ChatSched-side cancellation genuinely happened) but adds
// `payfast_cancelled: false` and `warning` so the UI can tell the person
// plainly rather than implying it's fully handled. SubscriptionSection.tsx
// surfaces that warning — don't remove it without checking this still
// fails sometimes in ways worth surfacing.
//
// A business (not publisher — launch credit is business-only) also
// forfeits any unused launch credit here, via forfeitBusinessLaunchCredit
// (_shared/launchCredit.ts) — confirmed product decision, not an
// engineering default. This runs regardless of whether the PayFast call
// above succeeded: ChatSched's own cancellation is real either way, and
// so is the forfeiture.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { cancelPayfastSubscription } from "../_shared/payfast.ts";
import { forfeitBusinessLaunchCredit } from "../_shared/launchCredit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { role } = await req.json();
    if (role !== "business" && role !== "publisher") {
      return json({ error: "Invalid role" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Not logged in" }, 401);

    const table = role === "business" ? "business_subscriptions" : "publisher_subscriptions";
    const idColumn = role === "business" ? "business_id" : "publisher_id";

    const { data: existing } = await supabase
      .from(table)
      .select("id, status, payfast_token")
      .eq(idColumn, user.id)
      .maybeSingle();

    if (!existing) return json({ error: "No subscription found" }, 404);
    if (existing.status === "cancelled") return json({ error: "Already cancelled" }, 400);

    // Attempt the PayFast-side cancellation BEFORE touching our own row,
    // so a crash/timeout here can't leave us thinking it's fully cancelled
    // when PayFast was never even asked. A subscription can reach 'active'
    // without a token only in the fully-covered-by-credit case (never
    // applies here — these are recurring subscriptions, not one-off
    // campaign payments), so in practice every non-pending row has one;
    // still, a missing token just means "nothing to tell PayFast", not an
    // error.
    let payfastCancelled = true;
    let warning: string | undefined;
    if (existing.payfast_token) {
      const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox") as "sandbox" | "live";
      const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")!;
      const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || undefined;
      try {
        const result = await cancelPayfastSubscription(existing.payfast_token, merchantId, passphrase, mode);
        if (!result.ok) {
          console.error("cancel-subscription: PayFast cancel call failed", {
            subscription_id: existing.id,
            status: result.status,
            body: result.body,
          });
          payfastCancelled = false;
          warning = "Your ChatSched access has been cancelled, but PayFast reported a problem stopping the recurring charge. Please also cancel it from your PayFast dashboard, or contact us, to be certain you won't be billed again.";
        }
      } catch (err) {
        console.error("cancel-subscription: PayFast cancel call threw", { subscription_id: existing.id, err });
        payfastCancelled = false;
        warning = "Your ChatSched access has been cancelled, but we couldn't reach PayFast to stop the recurring charge. Please also cancel it from your PayFast dashboard, or contact us, to be certain you won't be billed again.";
      }
    }

    // service role — a subscriber can only ever SELECT their own row
    // (schema_phase55's RLS: "no client writes"), same reasoning
    // business-subscribe/publisher-subscribe already use.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: updateError } = await admin
      .from(table)
      .update({ status: "cancelled", grace_period_started_at: null, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (updateError) return json({ error: "Could not cancel subscription" }, 500);

    if (role === "business") {
      await forfeitBusinessLaunchCredit(admin, user.id);
    }

    return json({ cancelled: true, payfast_cancelled: payfastCancelled, warning });
  } catch (err) {
    console.error("cancel-subscription: unexpected error", err);
    return json({ error: "Unexpected error cancelling subscription" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
