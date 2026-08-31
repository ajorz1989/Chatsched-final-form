import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Seo from "../components/Seo";

/**
 * /build-my-campaign — the destination "Build My Campaign" actually
 * needed. Submits straight into agency_leads (schema_phase59), the same
 * table /admin's Leads tab already manages — a submission here shows up
 * there immediately, stage 'new', ready for a campaign manager to follow
 * up. No account required to submit; business_id stays null until/unless
 * the person signs up later (agency_leads was built with that in mind
 * from the start).
 *
 * Not a self-service campaign builder that recommends channels or a
 * budget on the spot — that's real product surface (channel/publisher
 * recommendation logic) this page doesn't attempt. It's the capture
 * step: tell ChatSched the goal, a person follows up. Matches what's
 * actually built today rather than promising a wizard that isn't there.
 */
export default function BuildMyCampaign() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !contactEmail.trim() || !goal.trim()) return;
    setSending(true);
    setError(null);
    const { error: insertError } = await supabase.from("agency_leads").insert({
      business_name: businessName.trim(),
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim() || null,
      notes: goal.trim(),
      estimated_value: budget ? Number(budget) : null,
      source: "homepage",
    });
    setSending(false);
    if (insertError) {
      setError("Couldn't send that — check your details and try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <Seo title="Thanks — we've got it" description="Your campaign goal has been sent to ChatSched." />
        <span className="text-4xl block mb-4">✅</span>
        <h1 className="font-display text-2xl mb-3">Got it — we'll be in touch.</h1>
        <p className="text-billboard-inkSoft mb-8">
          A ChatSched campaign manager will look over what you told us and follow up, usually within a couple of
          working days. Want to see what's already live in the meantime?
        </p>
        <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition">
          Browse the marketplace →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Seo title="Build My Campaign · ChatSched" description="Tell ChatSched your goal — a campaign manager plans and runs the advertising for you across publishers, creators and channels." />
      <section className="bg-billboard-yellow border-b-[3px] border-billboard-ink py-16">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-white px-3 py-1.5 rounded mb-5">
            Managed Advertising
          </span>
          <h1 className="text-3xl md:text-5xl leading-tight mb-4">Tell us your goal. We'll build the campaign.</h1>
          <p className="text-billboard-inkSoft text-lg max-w-lg mx-auto">
            No need to find and message publishers yourself — a ChatSched campaign manager plans the channels,
            handles the publishers, and runs it end to end.
          </p>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-5 py-14">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wide mb-1.5">Business name *</label>
            <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full border-[3px] border-billboard-ink rounded px-3 py-2.5" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wide mb-1.5">Your name</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full border-[3px] border-billboard-ink rounded px-3 py-2.5" />
            </div>
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wide mb-1.5">Phone</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full border-[3px] border-billboard-ink rounded px-3 py-2.5" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wide mb-1.5">Email *</label>
            <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full border-[3px] border-billboard-ink rounded px-3 py-2.5" />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wide mb-1.5">What are you trying to achieve? *</label>
            <textarea
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              placeholder="e.g. more customers walking into our two Cape Town stores before December"
              className="w-full border-[3px] border-billboard-ink rounded px-3 py-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-mono font-semibold uppercase tracking-wide mb-1.5">Rough budget (R) — optional</label>
            <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full border-[3px] border-billboard-ink rounded px-3 py-2.5" />
          </div>

          {error && <p className="text-billboard-red text-sm font-semibold">{error}</p>}

          <button disabled={sending} className="w-full border-[3px] border-billboard-ink bg-billboard-ink text-white font-bold px-5 py-3.5 rounded hover:-translate-y-0.5 transition disabled:opacity-60">
            {sending ? "Sending…" : "Send my goal to ChatSched"}
          </button>
          <p className="text-xs text-billboard-inkSoft text-center">
            Prefer to browse and book publishers yourself?{" "}
            <Link to="/browse" className="underline font-semibold">
              Go to the marketplace →
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
