// PayFast's Instant Transaction Notification (ITN) webhook. PayFast calls
// this server-to-server after a payment completes — it is NOT triggered by
// the browser, so this function must be deployed with --no-verify-jwt
// (see supabase/DEPLOY.md). This is the only place a payment that actually
// goes through PayFast is ever marked "paid" — the /payment/return page
// the browser lands on is purely informational and never marks anything
// paid itself. The one deliberate exception is payfast-checkout marking a
// payment paid directly when it's fully covered by launch credit, since
// there's no PayFast leg to notify about in that case.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signItnFields, payfastHost } from "../_shared/payfast.ts";
import { forfeitBusinessLaunchCredit } from "../_shared/launchCredit.ts";
import { nextStatusOnFailedPayment, shouldForfeitLaunchCredit } from "../_shared/subscriptionLapseDecision.ts";
import { notifySubscriptionLapse } from "../_shared/notifySubscriptionLapse.ts";

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const entries = Array.from(params.entries());
    const data = Object.fromEntries(entries);

    const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox") as "sandbox" | "live";
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || undefined;

    // 1. Signature check.
    const expectedSignature = signItnFields(entries, passphrase);
    if (expectedSignature !== data.signature) {
      console.error("payfast-notify: signature mismatch", { received: data.signature });
      return new Response("invalid signature", { status: 200 });
    }

    // 2. Ask PayFast directly whether they actually sent this — the
    // authoritative check, since a signature alone can't rule out a replay
    // of a previously-valid payload.
    const validateRes = await fetch(`https://${payfastHost(mode)}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const validateText = (await validateRes.text()).trim();
    if (validateText !== "VALID") {
      console.error("payfast-notify: PayFast validate returned", validateText);
      return new Response("not valid", { status: 200 });
    }

    // Service role: this function runs as a trusted server (PayFast isn't a
    // Supabase-authenticated user), so it's the one legitimate place in this
    // app that bypasses RLS.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // AI Content Studio's recurring subscription is a separate table from
    // one-off campaign `payments` — routed here by the custom_str1 flag set
    // in content-studio-subscribe, checked before the payments lookup below
    // so the two flows never collide on m_payment_id.
    if (data.custom_str1 === "content_studio_subscription") {
      return handleContentStudioSubscriptionItn(admin, data);
    }
    if (data.custom_str1 === "publisher_subscription") {
      return handlePublisherSubscriptionItn(admin, data);
    }
    if (data.custom_str1 === "business_subscription") {
      return handleBusinessSubscriptionItn(admin, data);
    }

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("*")
      .eq("id", data.m_payment_id)
      .single();
    if (paymentError || !payment) {
      console.error("payfast-notify: unknown m_payment_id", data.m_payment_id);
      return new Response("unknown payment", { status: 200 });
    }

    // 3. Never trust the ITN's amount on its own — compare it to what we
    // actually charged for. A mismatch means something is wrong and the
    // payment should NOT be marked paid, even though the signature and the
    // PayFast validate check both passed.
    const received = Number.parseFloat(data.amount_gross ?? "0");
    const expected = Number(payment.amount);
    if (Math.abs(received - expected) > 0.01) {
      console.error("payfast-notify: amount mismatch", { received, expected, payment_id: payment.id });
      return new Response("amount mismatch", { status: 200 });
    }

    if (data.payment_status === "COMPLETE") {
      // Guarded with .neq("status", "paid") so a retried/duplicate ITN for
      // an already-paid payment matches zero rows and `updated` is null —
      // that's what stops the launch-credit redemption below from ever
      // firing twice for the same payment.
      const { data: updated } = await admin
        .from("payments")
        .update({ status: "paid", payfast_payment_id: data.pf_payment_id ?? null, paid_at: new Date().toISOString() })
        .eq("id", payment.id)
        .neq("status", "paid")
        .select()
        .maybeSingle();

      if (updated && Number(payment.credit_applied) > 0) {
        await redeemLaunchCredit(admin, payment.business_id, Number(payment.credit_applied));
      }
    } else if (data.payment_status === "FAILED") {
      await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("payfast-notify: unexpected error", err);
    // Still 200 — PayFast otherwise retries indefinitely for something that
    // may never succeed; real failures are visible in the function logs.
    return new Response("error logged", { status: 200 });
  }
});

// deno-lint-ignore no-explicit-any
async function handleContentStudioSubscriptionItn(admin: any, data: Record<string, string>) {
  const { data: subscription, error: subError } = await admin
    .from("content_studio_subscriptions")
    .select("*")
    .eq("id", data.m_payment_id)
    .maybeSingle();
  if (subError || !subscription) {
    console.error("payfast-notify: unknown content studio subscription", data.m_payment_id);
    return new Response("unknown subscription", { status: 200 });
  }

  // Same reasoning as the amount check above for one-off payments — never
  // trust the ITN amount blindly. R99/month is fixed, so any mismatch means
  // something's wrong (a tampered request, a stale price on an old link) and
  // this subscription should not be activated off the back of it.
  const received = Number.parseFloat(data.amount_gross ?? "0");
  if (Math.abs(received - 99.0) > 0.01 && data.payment_status === "COMPLETE") {
    console.error("payfast-notify: content studio amount mismatch", { received, subscription_id: subscription.id });
    return new Response("amount mismatch", { status: 200 });
  }

  if (data.payment_status === "COMPLETE") {
    // Each successful ITN (first payment or a monthly recurring charge)
    // pushes the period a month further out from whichever is later — the
    // stored period end or now — so a late-arriving webhook never shortens
    // what was already paid for.
    const base = subscription.current_period_end && new Date(subscription.current_period_end) > new Date()
      ? new Date(subscription.current_period_end)
      : new Date();
    const nextPeriodEnd = new Date(base);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await admin.from("content_studio_subscriptions").update({
      status: "active",
      payfast_token: data.token ?? subscription.payfast_token,
      current_period_end: nextPeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
  } else if (data.payment_status === "FAILED") {
    await admin.from("content_studio_subscriptions").update({
      status: subscription.status === "active" ? "past_due" : "cancelled",
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
  } else if (data.payment_status === "CANCELLED") {
    await admin.from("content_studio_subscriptions").update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
  }

  return new Response("ok", { status: 200 });
}

// Deducts an already-applied credit amount from a business's launch
// credit. Only ever called once per payment (see the .neq guard above),
// so this itself doesn't need to be idempotent against retries — but it
// still floors at zero rather than trusting remaining - amount can't go
// negative, in case credit_applied on the payment and remaining on the
// credit row have drifted for some other reason.
// deno-lint-ignore no-explicit-any
async function redeemLaunchCredit(admin: any, businessId: string, amount: number) {
  const { data: credit } = await admin
    .from("business_launch_credits")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!credit) {
    console.error("payfast-notify: payment had credit_applied but business has no launch credit row", { businessId, amount });
    return;
  }
  const newRemaining = Math.max(0, Number(credit.remaining) - amount);
  await admin
    .from("business_launch_credits")
    .update({ remaining: newRemaining, updated_at: new Date().toISOString() })
    .eq("id", credit.id);
}

// deno-lint-ignore no-explicit-any
async function handlePublisherSubscriptionItn(admin: any, data: Record<string, string>) {
  const { data: subscription, error: subError } = await admin
    .from("publisher_subscriptions")
    .select("*")
    .eq("id", data.m_payment_id)
    .maybeSingle();
  if (subError || !subscription) {
    console.error("payfast-notify: unknown publisher subscription", data.m_payment_id);
    return new Response("unknown subscription", { status: 200 });
  }

  // R99/month is fixed — same reasoning as the Content Studio branch above.
  const received = Number.parseFloat(data.amount_gross ?? "0");
  if (Math.abs(received - 99.0) > 0.01 && data.payment_status === "COMPLETE") {
    console.error("payfast-notify: publisher subscription amount mismatch", { received, subscription_id: subscription.id });
    return new Response("amount mismatch", { status: 200 });
  }

  if (data.payment_status === "COMPLETE") {
    const base = subscription.current_period_end && new Date(subscription.current_period_end) > new Date()
      ? new Date(subscription.current_period_end)
      : new Date();
    const nextPeriodEnd = new Date(base);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await admin.from("publisher_subscriptions").update({
      status: "active",
      payfast_token: data.token ?? subscription.payfast_token,
      current_period_end: nextPeriodEnd.toISOString(),
      // A payment landing means any past_due/grace_period lapse is over
      // — clear the grace clock so a later lapse starts counting fresh
      // rather than reading a stale timestamp from this recovery.
      grace_period_started_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
  } else if (data.payment_status === "FAILED") {
    // Decision (which status to move to) lives in
    // _shared/subscriptionLapseDecision.ts — see handleBusinessSubscriptionItn
    // below for the identical logic and why it's shared. No forfeiture
    // check here: publishers have no launch credit to forfeit.
    const nextStatus = nextStatusOnFailedPayment(subscription.status);
    // Also gates the email below — reused rather than re-checked, so the
    // "fresh entry, not a retry that's already in grace_period" condition
    // can't drift between the two.
    const enteringGracePeriod = nextStatus === "grace_period" && subscription.status !== "grace_period";
    const update: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    // Start the grace-period clock only when actually entering it fresh
    // — a further FAILED retry while already in grace_period must not
    // reset it (see subscriptionLapseDecision.ts's own comment on why).
    if (enteringGracePeriod) {
      update.grace_period_started_at = new Date().toISOString();
    }
    await admin.from("publisher_subscriptions").update(update).eq("id", subscription.id);
    if (enteringGracePeriod) {
      await notifySubscriptionLapse(admin, subscription.publisher_id, "publisher", "grace_period").catch((err) =>
        console.error("payfast-notify: grace period email failed", subscription.id, err)
      );
    }
  } else if (data.payment_status === "CANCELLED") {
    await admin.from("publisher_subscriptions").update({
      status: "cancelled",
      grace_period_started_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
  }

  return new Response("ok", { status: 200 });
}

// deno-lint-ignore no-explicit-any
async function handleBusinessSubscriptionItn(admin: any, data: Record<string, string>) {
  const { data: subscription, error: subError } = await admin
    .from("business_subscriptions")
    .select("*")
    .eq("id", data.m_payment_id)
    .maybeSingle();
  if (subError || !subscription) {
    console.error("payfast-notify: unknown business subscription", data.m_payment_id);
    return new Response("unknown subscription", { status: 200 });
  }

  // R199/month is fixed — same reasoning as the branches above.
  const received = Number.parseFloat(data.amount_gross ?? "0");
  if (Math.abs(received - 199.0) > 0.01 && data.payment_status === "COMPLETE") {
    console.error("payfast-notify: business subscription amount mismatch", { received, subscription_id: subscription.id });
    return new Response("amount mismatch", { status: 200 });
  }

  if (data.payment_status === "COMPLETE") {
    const base = subscription.current_period_end && new Date(subscription.current_period_end) > new Date()
      ? new Date(subscription.current_period_end)
      : new Date();
    const nextPeriodEnd = new Date(base);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    await admin.from("business_subscriptions").update({
      status: "active",
      payfast_token: data.token ?? subscription.payfast_token,
      current_period_end: nextPeriodEnd.toISOString(),
      // A payment landing means any past_due/grace_period lapse is over
      // — clear the grace clock so a later lapse starts counting fresh
      // rather than reading a stale timestamp from this recovery.
      grace_period_started_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);

    // Launch credit: a one-time grant on this subscription's first-ever
    // completed payment. Guarded by flipping launch_credit_granted
    // false -> true in the same query that checks it (an atomic
    // check-and-set), so a retried/duplicate ITN for that same first
    // payment can never grant it twice — the second attempt matches zero
    // rows and wonRace is null.
    if (!subscription.launch_credit_granted) {
      const { data: wonRace } = await admin
        .from("business_subscriptions")
        .update({ launch_credit_granted: true })
        .eq("id", subscription.id)
        .eq("launch_credit_granted", false)
        .select()
        .maybeSingle();

      if (wonRace) {
        await admin.from("business_launch_credits").insert({
          business_id: subscription.business_id,
          subscription_id: subscription.id,
          amount: 199.0,
          remaining: 199.0,
        });
      }
    }
  } else if (data.payment_status === "FAILED") {
    // Decision (which status to move to, whether that forfeits credit)
    // lives in _shared/subscriptionLapseDecision.ts — pulled out
    // specifically so it has real unit test coverage, since this file
    // itself can't be loaded outside Deno.
    const nextStatus = nextStatusOnFailedPayment(subscription.status);
    // Also gates the email below — reused rather than re-checked, so the
    // "fresh entry, not a retry that's already in grace_period" condition
    // can't drift between the two.
    const enteringGracePeriod = nextStatus === "grace_period" && subscription.status !== "grace_period";
    const update: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    // Start the grace-period clock only when actually entering it fresh
    // — a further FAILED retry while already in grace_period must not
    // reset it (see subscriptionLapseDecision.ts's own comment on why).
    if (enteringGracePeriod) {
      update.grace_period_started_at = new Date().toISOString();
    }
    await admin.from("business_subscriptions").update(update).eq("id", subscription.id);
    // In practice a subscription that's never been active also has no
    // credit yet (it's granted on the first COMPLETE payment), so this
    // is mostly a no-op here — but it's the correct call for the same
    // reason the explicit cancel path makes it, not a special case.
    if (shouldForfeitLaunchCredit(nextStatus)) {
      await forfeitBusinessLaunchCredit(admin, subscription.business_id);
    }
    if (enteringGracePeriod) {
      await notifySubscriptionLapse(admin, subscription.business_id, "business", "grace_period").catch((err) =>
        console.error("payfast-notify: grace period email failed", subscription.id, err)
      );
    }
  } else if (data.payment_status === "CANCELLED") {
    // PayFast-side cancellation reported back to us — e.g. cancelled
    // directly from the PayFast dashboard rather than through our own
    // cancel-subscription function. Same forfeiture applies here; this
    // is a real, independent path to 'cancelled', not just a mirror of
    // the one in cancel-subscription/index.ts.
    await admin.from("business_subscriptions").update({
      status: "cancelled",
      grace_period_started_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id);
    if (shouldForfeitLaunchCredit("cancelled")) {
      await forfeitBusinessLaunchCredit(admin, subscription.business_id);
    }
  }

  return new Response("ok", { status: 200 });
}
