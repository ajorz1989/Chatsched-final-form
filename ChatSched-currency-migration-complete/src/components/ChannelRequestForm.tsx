import { useState, useEffect, type FormEvent } from "react";
import { takeContentStudioDraft } from "../lib/contentStudioDraft";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { getChannelBySlug } from "../lib/channelRegistry";
import { CREATOR_APPROVAL_WINDOW_DAYS, BUSINESS_PAYMENT_WINDOW_DAYS, CREATOR_PAYOUT_WINDOW_HOURS, PLATFORM_COMMISSION_RATE } from "../lib/constants";
import { hasUsableBusinessSubscription } from "../lib/subscriptionGate";
import SubscriptionGateNotice from "./SubscriptionGateNotice";
import type { Publisher } from "../lib/types";

/**
 * The "Request Feature" form for the 4 request-flow channels (influencer,
 * website, podcast, radio) — replaces the sidebar campaign-request form +
 * PayFast flow used for social-media publishers. No online checkout: this
 * only creates a channel_requests row for the creator to approve/decline.
 * See PublisherDashboardView for the creator side of this same workflow.
 */
export default function ChannelRequestForm({ publisher }: { publisher: Publisher }) {
  const { user } = useAuth();
  const channelModule = getChannelBySlug(publisher.channel_slug);
  const ch = channelModule?.definition;

  // Businesses only get to pick from what this creator has actually said
  // they'll run (see AdFormatsPanel in the dashboard) — falls back to the
  // channel's full standard list if the creator hasn't narrowed it down.
  const availableMethods = ch?.advertisingMethods && publisher.accepted_ad_formats && publisher.accepted_ad_formats.length > 0
    ? ch.advertisingMethods.filter((m) => publisher.accepted_ad_formats!.includes(m.label))
    : ch?.advertisingMethods ?? [];

  const [method, setMethod] = useState(availableMethods[0]?.label ?? "");
  const [message, setMessage] = useState(() => takeContentStudioDraft() ?? "");
  const [amount, setAmount] = useState("");
  const [acceptedPaymentTerms, setAcceptedPaymentTerms] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (user) hasUsableBusinessSubscription(user.id).then(setSubscribed);
  }, [user]);

  if (!ch) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !method || !amount || !acceptedPaymentTerms) return;
    setSending(true);
    setFormError(null);
    const { error } = await supabase.from("channel_requests").insert({
      channel_slug: publisher.channel_slug,
      creator_id: publisher.id,
      business_id: user.id,
      campaign_message: message,
      advertising_method: method,
      proposed_amount: Number(amount),
    });
    setSending(false);
    if (error) setFormError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="border-2 border-billboard-greenDeep bg-[#EAF3EC] text-billboard-greenDeep rounded p-4 text-sm font-semibold">
        Request sent — {publisher.name} has {CREATOR_APPROVAL_WINDOW_DAYS} days to respond. Track it from your dashboard.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-2 border-billboard-ink rounded p-4 mb-3 bg-white">
        <p className="text-sm mb-3">Log in to request {ch.name.toLowerCase()} with {publisher.name}.</p>
        <Link to="/login" className="w-full inline-flex justify-center bg-billboard-yellow border-[3px] border-billboard-ink font-bold py-2.5 rounded hover:-translate-y-0.5 transition">Log in</Link>
        <p className="text-xs text-billboard-inkSoft mt-2">New here? <Link to="/register" className="underline font-semibold">Create a business account</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3">
      {subscribed === false && <SubscriptionGateNotice role="business" />}

      <div className="border-2 border-billboard-ink rounded p-3 mb-3 bg-white text-xs text-billboard-inkSoft">
        No online checkout for {ch.name.toLowerCase()} — {publisher.name} approves or declines your request, then you pay the platform directly.
      </div>

      <fieldset disabled={subscribed === false} className="border-0 p-0 m-0 min-w-0 disabled:opacity-50">
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Advertising method</label>
      <select
        required value={method} onChange={(e) => setMethod(e.target.value)}
        className="w-full border-2 border-billboard-ink rounded px-3 py-2 mb-3 bg-white text-sm"
      >
        {availableMethods.map((m) => (
          <option key={m.id} value={m.label}>{m.label}</option>
        ))}
      </select>

      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">What's the campaign?</label>
      <textarea
        required value={message} onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={`Tell ${publisher.name} what you'd like to promote and when`}
        className="w-full border-2 border-billboard-ink rounded px-3 py-2 mb-3 bg-white text-sm"
      />

      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Your proposed budget (ZAR)</label>
      <input
        required type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
        placeholder={`e.g. ${ch.minBudgetZAR}`}
        className="w-full border-2 border-billboard-ink rounded px-3 py-2 mb-1.5 bg-white text-sm"
      />
      {Number(amount) > 0 && (
        <p className="text-xs text-billboard-inkSoft mb-3">
          {publisher.name} receives R{(Number(amount) * (1 - PLATFORM_COMMISSION_RATE)).toFixed(2)} after the platform's {Math.round(PLATFORM_COMMISSION_RATE * 100)}% commission.
        </p>
      )}

      <div className="border-2 border-billboard-ink rounded p-3 mb-3 bg-billboard-paperDim">
        <p className="text-xs font-bold mb-1.5">Payment terms</p>
        <ul className="space-y-1 text-xs text-billboard-inkSoft">
          <li>• {publisher.name} has {CREATOR_APPROVAL_WINDOW_DAYS} days to approve or decline.</li>
          <li>• If approved, you'll have {BUSINESS_PAYMENT_WINDOW_DAYS} days to pay the platform — before the post goes live.</li>
          <li>• {publisher.name} is paid within {CREATOR_PAYOUT_WINDOW_HOURS} hours of the post going live.</li>
        </ul>
        <label className="flex items-start gap-2 text-xs mt-2 pt-2 border-t border-billboard-ink/15">
          <input type="checkbox" checked={acceptedPaymentTerms} onChange={(e) => setAcceptedPaymentTerms(e.target.checked)} className="mt-0.5" />
          I understand and accept these payment terms.
        </label>
      </div>

      {formError && <p className="text-billboard-red text-xs font-semibold mb-3">{formError}</p>}
      <button
        type="submit" disabled={sending || !acceptedPaymentTerms}
        className="w-full bg-billboard-yellow border-[3px] border-billboard-ink font-bold py-3 rounded hover:-translate-y-0.5 transition disabled:opacity-60"
      >
        {sending ? "Sending…" : "Submit request"}
      </button>
      </fieldset>
    </form>
  );
}
