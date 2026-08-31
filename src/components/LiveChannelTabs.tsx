import { useState } from "react";
import { Link } from "react-router-dom";
import { useReveal } from "../hooks/useReveal";
import { getChannelBySlug } from "../lib/channelRegistry";

// The original 4 channels launched alongside social media, plus the 7 added
// since — hero copy written fresh for this placement (each channel's own
// tagline is reused instead on its Channel Hub card and dedicated page, so
// the two never repeat). Shared between Home and Categories so both show
// the exact same hero messages.
export const LIVE_CHANNEL_TABS: { slug: string; hero: string }[] = [
  { slug: "influencer", hero: "Get real creators talking about your brand — to audiences who actually trust them." },
  { slug: "website", hero: "Put your business in front of readers already searching for what you sell." },
  { slug: "podcast", hero: "Sponsor the shows your customers already have playing in their ears." },
  { slug: "radio", hero: "Reach the whole neighbourhood — in the language they speak at home." },
  { slug: "sports", hero: "Get your brand in front of fans who show up for their team every single week." },
  { slug: "events", hero: "Put your brand in the room where your exact customer already showed up." },
  { slug: "community", hero: "Reach a neighbourhood through the group its members already trust." },
  { slug: "transport", hero: "Ride along on the route your customers already take every single day." },
  { slug: "informal-retail", hero: "Get on the counter of the shop your customers already walk into daily." },
  { slug: "associations", hero: "Reach the business owners who already showed up to network." },
  { slug: "restaurants", hero: "Get in front of customers who are already sitting down, paying attention." },
];

/** Tab switcher + active hero pane for the 4 live request-flow channels. No heading of its own — each page supplies its own framing above it. */
export default function LiveChannelTabs() {
  const [active, setActive] = useState(0);
  const reveal = useReveal<HTMLDivElement>();
  const tabs = LIVE_CHANNEL_TABS
    .map((t) => ({ ...t, module: getChannelBySlug(t.slug) }))
    .filter((t) => t.module);

  if (tabs.length === 0) return null;
  const current = tabs[active];
  const ch = current.module!.definition;

  return (
    <div ref={reveal.ref} className={reveal.className}>
      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {tabs.map((t, i) => (
          <button
            key={t.slug}
            onClick={() => setActive(i)}
            className={`inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold text-sm px-4 py-2.5 rounded transition ${
              i === active ? "bg-billboard-ink text-billboard-paper" : "bg-billboard-paper hover:-translate-y-0.5"
            }`}
          >
            <span>{t.module!.definition.emoji}</span> {t.module!.definition.name}
          </button>
        ))}
      </div>

      {/* Active pane */}
      <div className="border-[3px] border-billboard-ink rounded p-6 md:p-8 bg-billboard-paper grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <span className="text-5xl">{ch.emoji}</span>
        <div>
          <p className="text-xl md:text-2xl font-display leading-snug mb-4">{current.hero}</p>
          <ul className="grid sm:grid-cols-2 gap-2 mb-5">
            {ch.advertiserBenefits.slice(0, 4).map((b, i) => (
              <li key={i} className="flex gap-2 text-sm text-billboard-inkSoft">
                <span className="text-billboard-green mt-0.5 shrink-0">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Link
            to={`/channels/${ch.slug}`}
            className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-yellow text-billboard-ink font-bold px-5 py-2.5 rounded hover:bg-billboard-yellowDeep transition hover:-translate-y-0.5"
          >
            Explore {ch.name} →
          </Link>
        </div>
      </div>
    </div>
  );
}
