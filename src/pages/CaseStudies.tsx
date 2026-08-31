import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { usePublishers } from "../hooks/usePublishers";
import { getEnabledChannels } from "../lib/channelRegistry";
import { WarningIcon } from "../components/UiIcons";
import {
  CREATOR_APPROVAL_WINDOW_DAYS,
  BUSINESS_PAYMENT_WINDOW_DAYS,
  CREATOR_PAYOUT_WINDOW_HOURS,
  PLATFORM_COMMISSION_RATE,
  PUBLISHER_SHARE,
} from "../lib/constants";

const sharePct = Math.round(PUBLISHER_SHARE * 100);
const commissionPct = Math.round(PLATFORM_COMMISSION_RATE * 100);

interface Scenario {
  channel: string;
  channelEmoji: string;
  business: string;
  businessDetail: string;
  creator: string;
  creatorDetail: string;
  request: string;
  steps: { title: string; body: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    channel: "Social Media",
    channelEmoji: "📱",
    business: "A boutique coffee roaster in Woodstock, Cape Town",
    businessDetail: "Wants to reach nearby coffee drinkers ahead of a new single-origin launch.",
    creator: "A Cape Town food & lifestyle Facebook page",
    creatorDetail: "Runs a local page followed mostly by people within a few suburbs of the roastery.",
    request: "A main-feed post featuring the new bean, timed to launch week.",
    steps: [
      { title: "Business browses by category and city", body: "Filters Browse to Food & Drink pages based in Cape Town, and compares a shortlist by audience size and engagement." },
      { title: "Sends a request", body: "Submits what they want featured, the launch date, and a proposed budget — no account setup beyond signing up." },
      { title: "Creator approves", body: `The page owner reviews it in their dashboard and approves within the ${CREATOR_APPROVAL_WINDOW_DAYS}-day window.` },
      { title: "Business pays into escrow", body: `Pays by card within the ${BUSINESS_PAYMENT_WINDOW_DAYS}-day payment window — the money is held by ChatSched, not released yet.` },
      { title: "Post goes live, creator gets paid", body: `The page owner posts on launch day and marks it live. Payout follows within ${CREATOR_PAYOUT_WINDOW_HOURS} hours — ${sharePct}% to the creator, ${commissionPct}% platform commission.` },
    ],
  },
  {
    channel: "Influencer",
    channelEmoji: "🎤",
    business: "An independent nail studio in Sandton, Johannesburg",
    businessDetail: "Wants to build local awareness for a new gel-extension service.",
    creator: "A Johannesburg beauty micro-influencer",
    creatorDetail: "Posts get-ready-with-me and beauty-review content to a mostly local following.",
    request: "A short-form video reviewing the new service, filmed in-studio.",
    steps: [
      { title: "Business finds a fit", body: "Uses Audience Finder to describe the service and area, and gets matched against the real influencer directory." },
      { title: "Sends a channel request", body: "Requests the influencer directly — no online checkout at this stage, just the campaign details." },
      { title: "Influencer approves the brief", body: `Reviews the ask and approves within ${CREATOR_APPROVAL_WINDOW_DAYS} days, or the request closes automatically.` },
      { title: "Business pays into escrow", body: "Pays by EFT or card — held by ChatSched until the content is posted, not paid directly to the influencer up front." },
      { title: "Video goes live, influencer gets paid", body: `Once posted and marked live, payout follows within ${CREATOR_PAYOUT_WINDOW_HOURS} hours.` },
    ],
  },
  {
    channel: "Podcast",
    channelEmoji: "🎙️",
    business: "A family-run hardware store in Gqeberha",
    businessDetail: "Wants awareness ahead of a Saturday in-store sale.",
    creator: "A Nelson Mandela Bay local-interest podcast",
    creatorDetail: "Covers weekend events and local business for an Eastern Cape audience.",
    request: "A short host-read sponsorship mentioning the sale, in that week's episode.",
    steps: [
      { title: "Business browses the podcast channel", body: "Filters the channel directory to Eastern Cape shows in a relevant category." },
      { title: "Sends a request with the sale date", body: "Submits the ask and timing so the host can confirm it fits an upcoming episode." },
      { title: "Host approves", body: `Approves the sponsorship slot within the ${CREATOR_APPROVAL_WINDOW_DAYS}-day window.` },
      { title: "Business pays into escrow", body: `Pays within ${BUSINESS_PAYMENT_WINDOW_DAYS} days of approval — funds held until the episode airs.` },
      { title: "Episode airs, host gets paid", body: `Host marks it live once the episode is out; payout follows within ${CREATOR_PAYOUT_WINDOW_HOURS} hours.` },
    ],
  },
];

export default function CaseStudies() {
  const { publishers, loading } = usePublishers();
  const channels = getEnabledChannels();

  const provinceCounts = new Map<string, number>();
  for (const p of publishers) {
    provinceCounts.set(p.province, (provinceCounts.get(p.province) ?? 0) + 1);
  }
  const topProvinces = [...provinceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const channelCounts = new Map<string, number>();
  for (const p of publishers) {
    const slug = p.channel_slug || "social-media";
    channelCounts.set(slug, (channelCounts.get(slug) ?? 0) + 1);
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-16">
      <Seo
        title="Illustrative Examples · ChatSched"
        description="Walkthroughs of how a booking moves through ChatSched, from request to payout — illustrative examples, not real customer campaigns."
        noindex
      />
      <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">
        Illustrative examples
      </span>
      <h1 className="text-3xl md:text-4xl mb-3 max-w-2xl">What a booking looks like, start to finish.</h1>
      <p className="text-billboard-inkSoft max-w-2xl mb-3">
        ChatSched is in its pilot phase, so we don't have real published case studies yet — this page
        walks through three fictional scenarios instead, to show exactly how a request moves from first
        contact to a creator getting paid.
      </p>
      <div className="border-2 border-billboard-yellow bg-billboard-yellow/10 rounded p-4 mb-12 max-w-2xl">
        <p className="text-sm font-semibold flex items-center gap-1.5"><WarningIcon className="w-3.5 h-3.5" /> These are illustrative walkthroughs, not real customers</p>
        <p className="text-sm text-billboard-inkSoft mt-1">
          The businesses and creators below are made up to demonstrate the process. No names, figures, or
          results on this page describe an actual ChatSched campaign. Real stories will replace them here
          as they happen.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {SCENARIOS.map((s) => (
          <div key={s.channel} className="border-[3px] border-billboard-ink rounded-lg bg-white overflow-hidden">
            <div className="bg-billboard-paperDim border-b-[3px] border-billboard-ink px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{s.channelEmoji}</span>
                <span className="font-mono text-xs font-semibold uppercase tracking-wide">{s.channel} · Illustrative</span>
              </div>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6 border-b-2 border-billboard-paperDim">
              <div>
                <p className="font-mono text-[10px] uppercase text-billboard-inkSoft mb-1">The business</p>
                <p className="font-bold">{s.business}</p>
                <p className="text-sm text-billboard-inkSoft mt-1">{s.businessDetail}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-billboard-inkSoft mb-1">The creator</p>
                <p className="font-bold">{s.creator}</p>
                <p className="text-sm text-billboard-inkSoft mt-1">{s.creatorDetail}</p>
              </div>
              <div className="md:col-span-2 border-t border-billboard-ink/10 pt-4">
                <p className="font-mono text-[10px] uppercase text-billboard-inkSoft mb-1">What's requested</p>
                <p className="text-sm">{s.request}</p>
              </div>
            </div>

            <div className="p-6">
              <p className="font-mono text-[10px] uppercase text-billboard-inkSoft mb-3">How it would play out</p>
              <div className="flex flex-col gap-3">
                {s.steps.map((step, i) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-billboard-yellow border-2 border-billboard-ink flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-billboard-inkSoft mt-0.5">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Everything below this line is real — pulled live from the same
          publisher directory Browse uses, not illustrative. Kept clearly
          separate from the scenarios above rather than blended in, so it's
          never ambiguous which parts of this page are made up and which
          aren't. */}
      <div className="border-t-[3px] border-billboard-ink pt-12 mt-14">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-billboard-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-billboard-green" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-wider uppercase text-billboard-green">Live data — not illustrative</span>
        </div>
        <h2 className="text-2xl md:text-3xl mb-3 max-w-xl">What's actually on the platform right now.</h2>
        <p className="text-billboard-inkSoft max-w-2xl mb-8">
          Real counts from the same publisher directory Browse searches — no invented names or numbers below this line.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mb-10">
          {/* Channel breakdown */}
          <div className="border-[3px] border-billboard-ink rounded-lg bg-white p-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-billboard-inkSoft mb-4">Approved publishers by channel</p>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-8 rounded bg-billboard-paperDim animate-pulse" />)}
              </div>
            ) : publishers.length === 0 ? (
              <p className="text-sm text-billboard-inkSoft">No approved publishers yet — check back soon.</p>
            ) : (
              <div className="space-y-3">
                {channels.map(({ definition: ch }) => {
                  const count = channelCounts.get(ch.slug) ?? 0;
                  const pct = publishers.length > 0 ? Math.round((count / publishers.length) * 100) : 0;
                  return (
                    <div key={ch.slug}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold">{ch.emoji} {ch.name}</span>
                        <span className="font-mono text-xs text-billboard-inkSoft">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-billboard-paperDim overflow-hidden">
                        <div className="h-full bg-billboard-green rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Province reach */}
          <div className="border-[3px] border-billboard-ink rounded-lg bg-white p-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-billboard-inkSoft mb-4">Where publishers are based</p>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-8 rounded bg-billboard-paperDim animate-pulse" />)}
              </div>
            ) : topProvinces.length === 0 ? (
              <p className="text-sm text-billboard-inkSoft">No approved publishers yet — check back soon.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {topProvinces.map(([province, count]) => (
                  <div key={province} className="border-2 border-billboard-paperDim rounded p-3">
                    <div className="font-mono text-xl font-bold text-billboard-greenDeep">{count}</div>
                    <div className="text-xs text-billboard-inkSoft">{province}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-[3px] border-billboard-ink rounded-lg bg-billboard-ink text-billboard-paper p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-billboard-paper/60 mb-1">Total approved publishers, live now</p>
            <p className="font-display text-3xl">{loading ? "—" : publishers.length}</p>
          </div>
          <Link to="/browse" className="inline-flex items-center gap-2 bg-billboard-yellow text-billboard-ink border-[3px] border-billboard-yellow font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm">
            See them on Browse →
          </Link>
        </div>
      </div>

      <div className="text-center border-t-2 border-billboard-paperDim pt-10 mt-12">
        <p className="text-billboard-inkSoft mb-4 max-w-md mx-auto">
          Want to see the actual mechanics behind escrow and payout timing, or find a real publisher to work with?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/how-payment-works" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm bg-white">
            See how payment works
          </Link>
          <Link to="/browse" className="inline-flex items-center gap-2 bg-billboard-yellow border-[3px] border-billboard-ink font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm">
            Browse publishers
          </Link>
        </div>
      </div>
    </div>
  );
}
