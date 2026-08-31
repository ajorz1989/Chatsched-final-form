import { Link } from "react-router-dom";
import { useState } from "react";
import Seo from "../components/Seo";

const FAQS = [
  { q: "How do I know a publisher is legitimate?", a: "Every publisher and creator is reviewed by hand before they go live, and carries a visible trust score and level built from real campaign history — not just follower count." },
  { q: "Do I need a contract or subscription?", a: "No contract either way. Browsing and listing are always free. Sending a request needs an active ChatSched Business subscription (R199/month), and approving one needs an active Publisher Network subscription (R99/month)." },
  { q: "How does payment actually work?", a: "Funds are confirmed before a post goes live, and every payout is tracked from the moment your content is confirmed live — no chasing invoices, no guessing when money moves." },
  { q: "Can I choose which channels to advertise on?", a: "Yes — social media pages, influencer campaigns, website advertising, podcast sponsorships, and radio are all part of the same directory, filterable by channel and category." },
];

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b-2 border-billboard-ink">
      <button onClick={() => setOpen(!open)} className="w-full text-left py-4 flex justify-between items-center gap-4 font-bold">
        {q}
        <span className={`font-mono text-xl transition-transform shrink-0 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all ${open ? "max-h-40 pb-4" : "max-h-0"}`}>
        <p className="text-billboard-inkSoft text-sm">{a}</p>
      </div>
    </div>
  );
}

/** The request → verified → live → tracked flow, as a visual pipeline — no figures, just the mechanics that make it trustworthy on both sides. */
function ValueFlow() {
  const steps = [
    { emoji: "📝", label: "Request sent" },
    { emoji: "✅", label: "Confirmed & secured" },
    { emoji: "📣", label: "Campaign goes live" },
    { emoji: "💸", label: "Payout tracked" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {steps.map((s, i) => (
        <div key={s.label} className="relative border-2 border-billboard-paper rounded p-4 text-center">
          <span className="text-2xl block mb-1.5">{s.emoji}</span>
          <span className="font-mono text-[11px] uppercase tracking-wide">{s.label}</span>
          {i < steps.length - 1 && (
            <span className="hidden sm:block absolute top-1/2 -right-3 -translate-y-1/2 text-billboard-yellow font-bold">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** A mini mockup of a business's view into a publisher before booking — audience data, verification, and fit, all visible up front. */
function ReachMockup() {
  return (
    <div className="border-2 border-billboard-ink rounded p-4 bg-billboard-paperDim">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-wide text-billboard-inkSoft">Publisher profile preview</span>
        <span className="font-mono text-[10px] uppercase text-billboard-greenDeep font-bold border border-billboard-greenDeep rounded px-1.5 py-0.5">Verified</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-billboard-inkSoft">Audience fit</span>
          <span className="font-mono font-bold text-billboard-greenDeep">Strong match</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-billboard-inkSoft">Engagement</span>
          <span className="font-mono font-bold">Above average</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-billboard-inkSoft">Trust score</span>
          <span className="font-mono font-bold">{"⭐".repeat(5)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-billboard-inkSoft">Campaign history</span>
          <span className="font-mono font-bold">Track record visible</span>
        </div>
      </div>
    </div>
  );
}

/** A mini mockup of a publisher's dashboard queue — the same shape as the real thing, no figures, just showing that every request is tracked to a guaranteed outcome. */
function PayoutMockup() {
  const rows = [
    { label: "Request from a business", status: "Awaiting your response" },
    { label: "You approve", status: "Payment confirmed before going live" },
    { label: "Content goes live", status: "Payout window starts" },
  ];
  return (
    <div className="border-2 border-billboard-ink rounded p-4 bg-billboard-paperDim">
      <span className="font-mono text-[10px] uppercase tracking-wide text-billboard-inkSoft block mb-3">Your dashboard</span>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
            <span>{r.label}</span>
            <span className="font-mono text-[11px] font-semibold text-billboard-greenDeep text-right">{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <div>
      <Seo title="Pricing · ChatSched" description="No hidden fees, no guesswork — see exactly how businesses get transparent reach and publishers get secure, guaranteed value." />
      <section className="bg-billboard-ink text-billboard-paper py-16 border-b-[3px] border-billboard-ink">
        <div className="max-w-5xl mx-auto px-5">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-yellow text-billboard-yellow px-3 py-1.5 rounded mb-3">Pricing</span>
          <h1 className="text-3xl md:text-4xl mb-4 max-w-2xl">Built so both sides can trust the deal.</h1>
          <p className="text-billboard-paperDim max-w-xl mb-10">
            Every campaign follows the same secured, tracked path — from request to payout — so a business always
            knows what they're getting, and a publisher always knows they'll be paid for it.
          </p>
          <ValueFlow />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-16">
        <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">Membership</span>
        <h2 className="text-3xl md:text-4xl mb-3 max-w-xl">Two ways to join, one platform behind both.</h2>
        <p className="text-billboard-inkSoft max-w-xl mb-10">
          Browsing and listing are always free on each side — sending a request needs ChatSched Business
          (R199/month), and approving one needs the Publisher Network (R99/month).
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="border-[3px] border-billboard-ink rounded-lg p-6 bg-billboard-yellow">
            <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-white px-2.5 py-1 rounded mb-4">ChatSched Business</span>
            <p className="font-display text-3xl mb-1">R199<span className="text-base font-normal">/month</span></p>
            <p className="text-sm text-billboard-inkSoft mb-5">Includes a once-off R199 launch credit toward your first campaign.</p>
            <ul className="text-sm space-y-2 mb-6">
              <li>• Full marketplace access — search, compare, save, book</li>
              <li>• Managed advertising — tell ChatSched your goal, a campaign manager plans and runs it</li>
              <li>• Campaign tracking and reporting</li>
            </ul>
            <Link to="/build-my-campaign" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-ink text-white font-bold px-4 py-2.5 rounded text-sm hover:-translate-y-0.5 transition">Build My Campaign →</Link>
          </div>
          <div className="border-[3px] border-billboard-ink rounded-lg p-6 bg-white">
            <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-billboard-paperDim px-2.5 py-1 rounded mb-4">ChatSched Publisher Network</span>
            <p className="font-display text-3xl mb-1">R99<span className="text-base font-normal">/month</span></p>
            <p className="text-sm text-billboard-inkSoft mb-5">The full creator platform, not a directory listing.</p>
            <ul className="text-sm space-y-2 mb-6">
              <li>• Verified profile, media kit and rate card</li>
              <li>• Campaign opportunities and the opportunity feed</li>
              <li>• Earnings dashboard and analytics</li>
            </ul>
            <Link to="/register?role=publisher" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-4 py-2.5 rounded text-sm hover:-translate-y-0.5 transition">Join Publisher Network →</Link>
          </div>
        </div>
        <p className="text-xs text-billboard-inkSoft mt-6 max-w-2xl">
          A marketplace commission still applies to completed campaigns either way — a subscription changes what
          you get access to, not the per-campaign fee. See exactly how that's calculated on the fees page below.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-5 pb-16 grid md:grid-cols-2 gap-10">
        <div className="border-[3px] border-billboard-ink rounded p-6">
          <h2 className="font-display text-lg mb-3">Browsing without a subscription</h2>
          <p className="text-billboard-inkSoft text-sm mb-4">Fully self-service — sending a request needs a ChatSched Business subscription.</p>
          <ReachMockup />
          <ul className="text-sm text-billboard-inkSoft space-y-2 mt-5">
            <li>• See a publisher's real audience fit and trust score before you commit</li>
            <li>• Every campaign is tracked from request through to going live</li>
            <li>• Sending a request needs the R199/month ChatSched Business subscription</li>
          </ul>
          <Link to="/browse" className="inline-flex mt-5 items-center gap-2 border-[3px] border-billboard-ink font-bold px-4 py-2.5 rounded text-sm hover:-translate-y-0.5 transition">Browse Publishers →</Link>
        </div>
        <div className="border-[3px] border-billboard-ink rounded p-6 bg-billboard-paperDim">
          <h2 className="font-display text-lg mb-3">Listing without a subscription</h2>
          <p className="text-billboard-inkSoft text-sm mb-4">A basic profile is still free — the network membership unlocks the rest.</p>
          <PayoutMockup />
          <ul className="text-sm text-billboard-inkSoft space-y-2 mt-5">
            <li>• You set your own price on every listing</li>
            <li>• Payment is confirmed before your content goes live</li>
            <li>• Approving a request and full platform access (opportunities, analytics, earnings) need the R99/month membership</li>
          </ul>
          <Link to="/register?role=publisher" className="inline-flex mt-5 items-center gap-2 border-[3px] border-billboard-ink font-bold px-4 py-2.5 rounded text-sm hover:-translate-y-0.5 transition">Become a Publisher →</Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 pb-4">
        <div className="border-2 border-billboard-yellow bg-billboard-yellow/10 rounded p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm max-w-[52ch]">
            Before you commit to a campaign, ChatSched clearly shows the applicable pricing, fees and
            expected earnings — never a surprise at the final step.
          </p>
          <Link to="/fees" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-4 py-2.5 rounded text-sm bg-white shrink-0 hover:-translate-y-0.5 transition">See exact fees →</Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 pb-20">
        <h2 className="font-display text-xl mb-2">Common questions</h2>
        <div>{FAQS.map((f) => <FaqRow key={f.q} {...f} />)}</div>
      </section>
    </div>
  );
}
