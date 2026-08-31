import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import TrustedByStrip from "../components/TrustedByStrip";
import ChannelIcon from "../components/ChannelIcon";
import { getAllChannels } from "../lib/channelRegistry";
import {
  CREATOR_APPROVAL_WINDOW_DAYS,
  BUSINESS_PAYMENT_WINDOW_DAYS,
  CREATOR_PAYOUT_WINDOW_HOURS,
} from "../lib/constants";

const STEPS = [
  { n: "01", title: "Find your channel", body: "Browse social pages, influencers, websites, podcasts and radio slots by category, province and audience to find the match for your customers." },
  { n: "02", title: "Submit a request", body: "Pick a publisher and send a feature request describing what you want to promote — no account manager, no ad account, no minimum spend." },
  { n: "03", title: "Pay into escrow", body: "Once the publisher approves, pay securely by card, instant EFT, or manual EFT. Funds sit with ChatSched — not the publisher — until the placement is actually live." },
  { n: "04", title: "Get proof, not promises", body: "Watch your request move from submitted to live, with proof once it's done. No guessing where your budget went." },
];

const TOOLS = [
  { name: "Match", body: "Describe your business in plain language — get a ranked list of publishers who actually fit." },
  { name: "Reach Planner", body: "A guided wizard that turns a goal into a plan and a schedule." },
  { name: "AI Content Studio", body: "One photo or brief becomes nine ready-to-post formats — Facebook, Instagram, TikTok, WhatsApp, and more." },
  { name: "Campaign Builder", body: "Turn a plain-language brief into a scored campaign, with suggestions to improve it." },
  { name: "Campaign Tracker", body: "Real tracking links for every campaign — clicks, visits, leads and conversions, not estimates." },
  { name: "ROI Calculator", body: "Put in a budget, get an estimated reach and return before you commit." },
];

const COMPARISON = [
  { us: "You know exactly who's featuring you and why they fit your customers.", them: "Your ad competes for attention inside an anonymous feed algorithm." },
  { us: "Publishers are manually checked before they're ever listed.", them: "Reach numbers are self-reported and can't always be verified." },
  { us: "Payment sits in escrow until the placement is confirmed live.", them: "You pay upfront and hope the algorithm delivers." },
  { us: "Local, trusted channels your customers already follow.", them: "Increasingly blocked by ad blockers and ignored by banner blindness." },
];

const FAQS = [
  { q: "Do I need a contract or subscription?", a: "No contract either way. Browsing is always free — sending a request needs an active ChatSched Business subscription (R199/month), which also unlocks managed advertising." },
  { q: "How do I know a publisher is legitimate?", a: "Every publisher and creator is reviewed by hand before they're listed, and carries a visible trust score and level built from real campaign history — not just a follower count." },
  { q: "When does money actually move?", a: `Once a publisher approves your request, you have ${BUSINESS_PAYMENT_WINDOW_DAYS} days to pay into escrow. It's held there — not released to the publisher — until the placement is confirmed live.` },
  { q: "What if a publisher doesn't respond?", a: `Publishers have ${CREATOR_APPROVAL_WINDOW_DAYS} days to approve or decline a request. If it's not actioned in that window, it closes automatically — you're never left waiting indefinitely.` },
  { q: "Which channels can I book?", a: "Social media pages and groups, influencers, websites, podcasts and radio slots — all through the same request-and-approve flow." },
];

export default function ForBusinesses() {
  return (
    <div>
      <Seo
        title="For Businesses · ChatSched"
        description="Book real South African publishers and creators directly — no ad account, no bidding, no algorithm. Escrow-held payment, tracked campaigns, proof once it's live."
      />

      {/* HERO */}
      <section className="bg-billboard-yellow border-b-[3px] border-billboard-ink py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5">
          <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-billboard-paper px-3 py-1.5 rounded mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-billboard-red" /> For Businesses
          </span>
          <h1 className="text-4xl md:text-6xl leading-[1.05] mb-5 max-w-3xl">
            Reach the audience your customers already trust.
          </h1>
          <p className="text-lg text-billboard-inkSoft max-w-[56ch] mb-8">
            ChatSched connects South African small businesses directly with the pages, creators and channels their
            customers already follow — no algorithm, no ad account, no bidding war. You pay only once a real person
            has confirmed your placement is live.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-ink text-billboard-paper font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">
              Browse Publishers →
            </Link>
            <Link to="/register?role=business" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-paper font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">
              Register as a Business →
            </Link>
          </div>
        </div>
      </section>

      <TrustedByStrip heading="Real businesses, already booking real reach." />

      {/* HOW IT WORKS */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">How it works</span>
          <h2 className="text-3xl md:text-4xl mb-10 max-w-xl">From request to live, in four steps.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="border-[3px] border-billboard-ink rounded p-5 bg-white transition hover:-translate-y-1 hover:shadow-blockSm">
                <div className="font-display text-2xl text-billboard-yellowDeep mb-2" style={{ WebkitTextStroke: "1.5px #1A1712" }}>{s.n}</div>
                <h3 className="font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-billboard-inkSoft">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/how-payment-works" className="inline-flex items-center gap-2 font-semibold underline text-billboard-inkSoft hover:text-billboard-ink">
              See the full escrow &amp; payout timeline →
            </Link>
          </div>
        </div>
      </section>

      {/* CHANNELS */}
      <section className="py-20 bg-billboard-paperDim border-y-[3px] border-billboard-ink">
        <div className="max-w-5xl mx-auto px-5">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">Five channels, one flow</span>
          <h2 className="text-3xl md:text-4xl mb-3 max-w-xl">Book wherever your customers already are.</h2>
          <p className="text-billboard-inkSoft max-w-xl mb-10">Every channel below runs through the same simple request-and-approve flow — pick the ones that fit.</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {getAllChannels().map((m) => (
              <Link
                key={m.definition.slug}
                to={`/channels/${m.definition.slug}`}
                className="block border-[3px] border-billboard-ink rounded p-5 bg-white transition hover:-translate-y-1 hover:shadow-blockSm"
              >
                <div className="mb-3"><ChannelIcon slug={m.definition.slug} /></div>
                <h3 className="font-bold text-sm mb-1">{m.definition.name}</h3>
                <p className="text-xs text-billboard-inkSoft">{m.definition.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETING SUITE TEASER */}
      <section className="py-20 bg-billboard-ink text-billboard-paper border-b-[3px] border-billboard-ink">
        <div className="max-w-5xl mx-auto px-5">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-yellow text-billboard-yellow px-3 py-1.5 rounded mb-3">In your dashboard</span>
          <h2 className="text-3xl md:text-4xl mb-3 max-w-xl">A full marketing suite, not just a directory.</h2>
          <p className="text-billboard-paperDim max-w-xl mb-10">Once you're registered, these tools live right in your dashboard alongside your requests.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((t) => (
              <div key={t.name} className="border-2 border-[#3A342B] rounded p-4 bg-[#211D17]">
                <h3 className="font-bold text-sm mb-1 text-billboard-paper">{t.name}</h3>
                <p className="text-xs text-billboard-paperDim">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-5">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">Why not just run social ads?</span>
          <h2 className="text-3xl md:text-4xl mb-8 max-w-xl">A direct marketplace, not an ad platform.</h2>
          <div className="border-[3px] border-billboard-ink rounded-lg overflow-hidden">
            <div className="grid grid-cols-2">
              <div className="bg-billboard-green text-white font-display text-sm md:text-base px-4 py-3 text-center">ChatSched</div>
              <div className="bg-billboard-inkSoft text-white font-display text-sm md:text-base px-4 py-3 text-center border-l-[3px] border-billboard-ink">Social Ad Platforms</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className={`grid grid-cols-2 ${i !== COMPARISON.length - 1 ? "border-b-2 border-billboard-ink/15" : ""}`}>
                <div className="p-4 md:p-5 text-sm flex items-start gap-2.5 transition-colors hover:bg-billboard-green/5">
                  <span className="text-billboard-green mt-0.5 shrink-0">✓</span>
                  <span>{row.us}</span>
                </div>
                <div className="p-4 md:p-5 text-sm flex items-start gap-2.5 border-l-2 border-billboard-ink/15 text-billboard-inkSoft transition-colors hover:bg-billboard-red/5">
                  <span className="text-billboard-red mt-0.5 shrink-0">✕</span>
                  <span>{row.them}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESCROW STRIP */}
      <section className="py-16 bg-billboard-paperDim border-y-[3px] border-billboard-ink">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <p className="text-sm font-semibold mb-1">🔒 Money doesn't move until the work does</p>
          <p className="text-billboard-inkSoft max-w-2xl mx-auto text-sm">
            Your payment sits in escrow — not with the publisher — until your placement is confirmed live.
            The publisher is paid out within {CREATOR_PAYOUT_WINDOW_HOURS} hours of going live. Nobody fronts the risk alone.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 py-20">
        <h2 className="font-display text-xl mb-8 text-center">Common questions</h2>
        <div className="border-[3px] border-billboard-ink rounded-lg bg-white overflow-hidden">
          {FAQS.map((f, i) => (
            <div key={f.q} className={i !== FAQS.length - 1 ? "border-b-2 border-billboard-ink" : ""}>
              <details className="group">
                <summary className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-billboard-paperDim transition-colors cursor-pointer list-none font-bold text-sm">
                  {f.q}
                  <span className="font-display text-lg shrink-0 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-billboard-inkSoft">{f.a}</p>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-billboard-green border-t-[3px] border-billboard-ink text-center">
        <div className="max-w-2xl mx-auto px-5">
          <h2 className="font-display text-2xl md:text-3xl text-white mb-4">Ready to get in front of a real audience?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-white font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition">
              Browse Publishers →
            </Link>
            <Link to="/register?role=business" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-yellow font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition">
              Register as a Business →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
