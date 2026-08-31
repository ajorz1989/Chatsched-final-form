// Starts a R199/month PayFast recurring subscription for ChatSched
// Business. Same shape as publisher-subscribe / content-studio-subscribe.
// The R199 launch credit is NOT granted here — it's granted by
// payfast-notify, once, on this subscription's first COMPLETE payment, so
// it's only ever issued against money that's actually landed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { signCheckoutFields, payfastHost } from "../_shared/payfast.ts";

// Keep in sync with BUSINESS_SUBSCRIPTION_PRICE in src/lib/constants.ts —
// Deno edge functions can't import from the Vite app, so this is the one
// other place that number lives.
const MONTHLY_PRICE = 199.0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Not logged in" }, 401);

    const { data: profile } = await supabase.from("profiles").select("role, full_name, company_name").eq("id", user.id).maybeSingle();
    if (!profile || profile.role !== "business") return json({ error: "Only business accounts can subscribe to ChatSched Business" }, 403);

    const { data: existing } = await supabase
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", user.id)
      .maybeSingle();

    if (existing?.status === "active" || existing?.status === "grace_period") {
      return json({ error: "You're already subscribed to ChatSched Business" }, 400);
    }

    // service role — this function creates/updates the subscription row
    // itself (a business can only ever SELECT it, per schema_phase55's
    // RLS), same reasoning as content-studio-subscribe.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let subscriptionId: string;
    if (existing) {
      subscriptionId = existing.id;
      await admin.from("business_subscriptions").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      const { data: created, error: createError } = await admin
        .from("business_subscriptions")
        .insert({ business_id: user.id, status: "pending" })
        .select()
        .single();
      if (createError || !created) return json({ error: "Could not start subscription" }, 500);
      subscriptionId = created.id;
    }

    const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox") as "sandbox" | "live";
    const siteUrl = Deno.env.get("SITE_URL")!;
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")!;
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || undefined;

    const fullName = profile.company_name || profile.full_name || "Business Owner";
    const [nameFirst, ...rest] = fullName.split(" ");
    const nameLast = rest.join(" ") || "-";

    const today = new Date().toISOString().slice(0, 10);

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/payment/return`,
      cancel_url: `${siteUrl}/payment/cancel`,
      notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payfast-notify`,
      name_first: nameFirst,
      name_last: nameLast,
      email_address: user.email ?? "",
      m_payment_id: subscriptionId,
      amount: MONTHLY_PRICE.toFixed(2),
      item_name: "ChatSched Business (monthly)",
      item_description: "Monthly ChatSched Business membership — marketplace access, managed advertising, campaign tools and reporting. Includes a R199 launch credit on your first payment.",
      custom_str1: "business_subscription",
      subscription_type: "1",
      billing_date: today,
      recurring_amount: MONTHLY_PRICE.toFixed(2),
      frequency: "3", // PayFast: 3 = monthly
      cycles: "0", // 0 = indefinite, until cancelled
    };

    const signature = signCheckoutFields(fields, passphrase);

    return json({
      action_url: `https://${payfastHost(mode)}/eng/process`,
      fields: { ...fields, signature },
    });
  } catch (err) {
    console.error("business-subscribe: unexpected error", err);
    return json({ error: "Unexpected error starting subscription" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
