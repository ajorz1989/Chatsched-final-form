import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { redirectToPayfast } from "../lib/payfastRedirect";
import { subscriptionStatusInfo, isSubscriptionUsable, type SubscriptionStatus } from "../lib/subscriptions";
import { PUBLISHER_SUBSCRIPTION_PRICE, BUSINESS_SUBSCRIPTION_PRICE } from "../lib/constants";
import { formatCurrency } from "../lib/currency";

interface Props {
  userId: string;
  role: "business" | "publisher";
}

interface SubscriptionRow {
  status: SubscriptionStatus;
  current_period_end: string | null;
}

interface CreditRow {
  amount: number;
  remaining: number;
}

export default function SubscriptionSection({ userId, role }: Props) {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [credit, setCredit] = useState<CreditRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const table = role === "business" ? "business_subscriptions" : "publisher_subscriptions";
  const idColumn = role === "business" ? "business_id" : "publisher_id";
  const functionName = role === "business" ? "business-subscribe" : "publisher-subscribe";
  const price = role === "business" ? BUSINESS_SUBSCRIPTION_PRICE : PUBLISHER_SUBSCRIPTION_PRICE;
  const label = role === "business" ? "ChatSched Business" : "ChatSched Publisher Network";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from(table).select("status, current_period_end").eq(idColumn, userId).maybeSingle();
      if (cancelled) return;
      setSubscription((data as SubscriptionRow) ?? null);

      if (role === "business") {
        const { data: creditData } = await supabase
          .from("business_launch_credits")
          .select("amount, remaining")
          .eq("business_id", userId)
          .maybeSingle();
        if (!cancelled) setCredit((creditData as CreditRow) ?? null);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, role, table, idColumn]);

  async function subscribe() {
    setSubscribing(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke(functionName, { body: {} });
    setSubscribing(false);
    if (invokeError || data?.error) {
      setError(data?.error ?? "Couldn't start the subscription — try again in a moment.");
      return;
    }
    redirectToPayfast(data.action_url, data.fields);
  }

  async function cancelSubscription() {
    setCancelling(true);
    setError(null);
    setWarning(null);
    const { data, error: invokeError } = await supabase.functions.invoke("cancel-subscription", { body: { role } });
    setCancelling(false);
    setConfirmingCancel(false);
    if (invokeError || data?.error) {
      setError(data?.error ?? "Couldn't cancel — try again in a moment.");
      return;
    }
    if (data?.payfast_cancelled === false && data?.warning) {
      setWarning(data.warning);
    }
    setSubscription((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    if (role === "business") {
      setCredit((prev) => (prev ? { ...prev, remaining: 0 } : prev));
    }
  }

  if (loading) return null;

  const status = subscription?.status ?? null;
  const info = status ? subscriptionStatusInfo(status) : null;
  const usable = status ? isSubscriptionUsable(status) : false;

  const toneClass =
    info?.tone === "positive"
      ? "text-green-700"
      : info?.tone === "warning"
      ? "text-amber-700"
      : info?.tone === "negative"
      ? "text-billboard-red"
      : "text-billboard-inkSoft";

  return (
    <section className="border-[3px] border-billboard-ink rounded p-6 mb-6">
      <h2 className="font-display text-lg mb-1.5">{label}</h2>
      <p className="text-sm text-billboard-inkSoft mb-4">
        R{price}/month.
        {role === "business" && " Includes a once-off R199 launch credit toward your first campaign."}
      </p>

      {status && (
        <p className={`text-sm font-semibold mb-3 ${toneClass}`}>
          Status: {info?.label}
          {subscription?.current_period_end && usable
            ? ` — renews ${new Date(subscription.current_period_end).toLocaleDateString("en-ZA")}`
            : ""}
        </p>
      )}

      {role === "business" && credit && (
        <p className="text-sm text-billboard-inkSoft mb-4">
          Launch credit: R{Number(credit.remaining).toFixed(2)} of R{Number(credit.amount).toFixed(2)} remaining
        </p>
      )}

      {error && <p className="text-billboard-red text-xs font-semibold mb-3">{error}</p>}
      {warning && <p className="text-amber-700 text-xs font-semibold mb-3">{warning}</p>}

      {!usable && (
        <button
          onClick={subscribe}
          disabled={subscribing}
          className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm bg-white disabled:opacity-60"
        >
          {subscribing ? "Starting…" : status ? "Retry payment" : `Subscribe — ${formatCurrency(price)}/month`}
        </button>
      )}

      {usable && !confirmingCancel && (
        <button
          onClick={() => setConfirmingCancel(true)}
          className="text-xs font-semibold underline text-billboard-inkSoft"
        >
          Cancel subscription
        </button>
      )}

      {confirmingCancel && (
        <div className="border-2 border-billboard-ink rounded p-3 mt-2">
          <p className="text-xs mb-3">
            This stops your ChatSched access and cancels the recurring charge on PayFast's side. If
            PayFast can't be reached at the moment you cancel, we'll let you know here so you can
            cancel it from your PayFast dashboard directly instead.
            {role === "business" && credit && Number(credit.remaining) > 0 && (
              <>
                {" "}
                You'll also forfeit your remaining launch credit — R{Number(credit.remaining).toFixed(2)} — it
                won't carry over if you resubscribe.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={cancelSubscription}
              disabled={cancelling}
              className="font-mono text-[11px] font-semibold uppercase border-2 border-billboard-red text-billboard-red rounded px-3 py-1.5 disabled:opacity-60"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              onClick={() => setConfirmingCancel(false)}
              className="font-mono text-[11px] font-semibold uppercase border-2 border-billboard-ink rounded px-3 py-1.5"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
