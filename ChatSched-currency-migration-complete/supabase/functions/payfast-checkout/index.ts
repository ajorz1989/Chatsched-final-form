// Called by a logged-in business (via supabase.functions.invoke) to start
// paying for a confirmed campaign request. Returns a PayFast action_url and
// signed fields for the client to POST as a redirect — the signature is
// computed here, server-side, so the PayFast passphrase never reaches the
// browser bundle.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { signCheckoutFields, payfastHost } from "../_shared/payfast.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { request_id } = await req.json();
    if (!request_id) return json({ error: "request_id is required" }, 400);

    // Scoped to the calling user's own JWT — every query below runs under
    // their RLS policies, so this function can only ever act on their own
    // requests and payments, the same as if they'd queried Supabase directly.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Not logged in" }, 401);

    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("*, publisher:publishers(name)")
      .eq("id", request_id)
      .single();
    if (requestError || !request) return json({ error: "Request not found" }, 404);
    if (request.business_id !== user.id) return json({ error: "Not your request" }, 403);
    if (request.status !== "confirmed") return json({ error: "This request isn't confirmed yet" }, 400);
    if (!request.agreed_amount) return json({ error: "The platform hasn't set an amount for this yet — check back soon" }, 400);

    const { data: latest } = await supabase
      .from("payments")
      .select("*")
      .eq("request_id", request_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let payment = latest;
    if (payment?.status === "paid") {
      return json({ error: "This campaign is already paid" }, 400);
    }
    if (!payment || payment.status === "failed" || payment.status === "cancelled") {
      const { data: created, error: createError } = await supabase
        .from("payments")
        .insert({ request_id, business_id: user.id, amount: request.agreed_amount })
        .select()
        .single();
      if (createError || !created) return json({ error: "Could not start payment" }, 500);
      payment = created;
    }

    // Apply any available ChatSched Business launch credit. Recomputed
    // fresh on every checkout attempt (not just when the payment row is
    // first created) since remaining credit can change between attempts —
    // e.g. spent on a different campaign in the meantime.
    const { data: credit } = await supabase
      .from("business_launch_credits")
      .select("remaining")
      .eq("business_id", user.id)
      .maybeSingle();
    const { creditApplied, amountDue } = applyLaunchCredit(Number(payment.amount), Number(credit?.remaining ?? 0));

    if (amountDue <= 0) {
      // Fully covered by credit — PayFast doesn't take a R0 checkout, so
      // this is marked paid directly instead of redirecting there. Using
      // the service-role client and the same .neq("status","paid") guard
      // payfast-notify uses, so a duplicate call (e.g. a double-click)
      // can't redeem the credit twice. This is the one deliberate
      // exception to "payfast-notify is the only place status becomes
      // paid" — see the note at the top of that file.
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: updated } = await admin
        .from("payments")
        .update({ status: "paid", credit_applied: creditApplied, paid_at: new Date().toISOString() })
        .eq("id", payment.id)
        .neq("status", "paid")
        .select()
        .maybeSingle();

      if (updated) {
        const { data: creditRow } = await admin
          .from("business_launch_credits")
          .select("*")
          .eq("business_id", user.id)
          .maybeSingle();
        if (creditRow) {
          await admin
            .from("business_launch_credits")
            .update({ remaining: Math.max(0, Number(creditRow.remaining) - creditApplied), updated_at: new Date().toISOString() })
            .eq("id", creditRow.id);
        }
      }

      return json({ fully_covered: true });
    }

    if (creditApplied !== Number(payment.credit_applied)) {
      await supabase.from("payments").update({ credit_applied: creditApplied }).eq("id", payment.id);
    }

    const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox") as "sandbox" | "live";
    const siteUrl = Deno.env.get("SITE_URL")!;
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")!;
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || undefined;

    const fullName = (user.user_metadata?.full_name as string | undefined) || "Business Owner";
    const [nameFirst, ...rest] = fullName.split(" ");
    const nameLast = rest.join(" ") || "-";

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/payment/return`,
      cancel_url: `${siteUrl}/payment/cancel`,
      notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payfast-notify`,
      name_first: nameFirst,
      name_last: nameLast,
      email_address: user.email ?? "",
      m_payment_id: payment.id,
      amount: amountDue.toFixed(2),
      item_name: `Campaign: ${request.publisher?.name ?? "ChatSched"}`.slice(0, 100),
      item_description: (request.campaign_message ?? "").slice(0, 255),
    };

    const signature = signCheckoutFields(fields, passphrase);

    return json({
      action_url: `https://${payfastHost(mode)}/eng/process`,
      fields: { ...fields, signature },
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Unexpected error starting payment" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Same math as applyLaunchCredit() in src/lib/subscriptions.ts, duplicated
// here for the same reason MONTHLY_PRICE is duplicated in
// publisher-subscribe/business-subscribe — Deno edge functions can't
// import from the Vite app. Keep in sync if either changes.
function applyLaunchCredit(campaignAmount: number, availableCredit: number): { creditApplied: number; amountDue: number } {
  const safeAmount = Math.max(0, campaignAmount);
  const safeCredit = Math.max(0, availableCredit);
  const creditApplied = Math.round(Math.min(safeAmount, safeCredit) * 100) / 100;
  const amountDue = Math.round((safeAmount - creditApplied) * 100) / 100;
  return { creditApplied, amountDue };
}
