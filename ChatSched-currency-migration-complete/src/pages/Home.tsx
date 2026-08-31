import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePublishers } from "../hooks/usePublishers";
import PublisherCard from "../components/PublisherCard";
import { PublisherCardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useReveal } from "../hooks/useReveal";
import LiveChannelTabs from "../components/LiveChannelTabs";
import TrustedByStrip from "../components/TrustedByStrip";
import RecentlyViewedStrip from "../components/RecentlyViewedStrip";
import Seo from "../components/Seo";
import { SA_CITIES_SUBURBS, CREATOR_APPROVAL_WINDOW_DAYS, CREATOR_PAYOUT_WINDOW_HOURS, PLATFORM_COMMISSION_RATE, PUBLISHER_SHARE } from "../lib/constants";

const PROVINCE_COUNT = new Set(SA_CITIES_SUBURBS.map((c) => c.province)).size;

function useCountUp(target: number, { decimals = 0, duration = 1400 } = {}) {
  const { ref, className } = useReveal<HTMLDivElement>();
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setValue(target); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(target * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return { ref, className, value: decimals ? value.toFixed(decimals) : Math.round(value) };
}

function MetricCounter({ prefix = "", target, suffix = "", label, decimals = 0 }: { prefix?: string; target: number; suffix?: string; label: string; decimals?: number }) {
  const { ref, className, value } = useCountUp(target, { decimals });
  return (
    <div ref={ref} className={`border-[3px] border-billboard-ink rounded-lg bg-billboard-paper px-5 py-4 text-center shadow-blockSm ${className}`}>
      <div className="font-display text-2xl md:text-3xl">
        {prefix}{value.toLocaleString()}{suffix}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-billboard-inkSoft mt-1">{label}</div>
    </div>
  );
}

/** Two-panel animated hero mockup: publisher monetizing reach, business getting results. */
function HeroMockups() {
  const [side, setSide] = useState<"publisher" | "business">("publisher");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = window.setInterval(() => setSide((s) => (s === "publisher" ? "business" : "publisher")), 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-[420px]">
      <div className="relative w-full aspect-[16/11] bg-billboard-paper border-[3px] border-billboard-ink rounded shadow-block -rotate-[1.4deg] overflow-hidden">
        <span className="absolute -top-3.5 right-3.5 bg-billboard-red text-white font-mono text-[11px] font-semibold px-2.5 py-1 rounded rotate-3 border-2 border-billboard-ink z-10">LIVE NOW</span>

        {/* Publisher view */}
        <div className={`absolute inset-0 p-5 flex flex-col justify-center transition-all duration-700 ${side === "publisher" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"}`}>
          <div className="font-mono text-[10px] uppercase tracking-wider text-billboard-inkSoft mb-2">Publisher dashboard</div>
          <div className="border-2 border-billboard-ink rounded p-3 bg-white mb-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm">Bean &amp; Bay Coffee Club</span>
              <span className="font-mono text-[10px] font-bold uppercase bg-billboard-yellow border-2 border-billboard-ink rounded-full px-2 py-0.5">Request</span>
            </div>
            <span className="font-mono text-[10px] text-billboard-inkSoft">Wants to feature their spring menu</span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono text-xs font-bold border-2 border-billboard-ink rounded px-3 py-1.5 bg-billboard-green text-white">Approve</span>
            <span className="font-mono text-xs font-bold border-2 border-billboard-ink rounded px-3 py-1.5 bg-white">Decline</span>
          </div>
          <p className="font-mono text-[10px] text-billboard-inkSoft mt-3">Clean, direct requests — you decide what fits your audience.</p>
        </div>

        {/* Business view */}
        <div className={`absolute inset-0 p-5 flex flex-col justify-center transition-all duration-700 ${side === "business" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"}`}>
          <div className="font-mono text-[10px] uppercase tracking-wider text-billboard-inkSoft mb-2">Business results</div>
          <div className="border-2 border-billboard-ink rounded p-3 bg-white mb-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-full bg-billboard-green flex items-center justify-center text-white text-sm">✓</span>
              <span className="font-bold text-sm">Placement live</span>
            </div>
            <span className="font-mono text-[10px] text-billboard-inkSoft">Featured on Studio Nine Hair's page</span>
          </div>
          <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs border-[1.5px] border-billboard-greenDeep bg-billboard-green text-white rounded-bl-sm">Proof sent — real reach, real audience ✅</div>
          <p className="font-mono text-[10px] text-billboard-inkSoft mt-3">Direct, transparent marketing — no guessing where your reach went.</p>
        </div>
      </div>
      <div className="flex gap-14 -mt-0.5 justify-center"><span className="w-2.5 h-12 bg-billboard-ink" /><span className="w-2.5 h-12 bg-billboard-ink" /></div>
      <div className="w-2/3 max-w-[340px] h-1 bg-billboard-ink rounded mt-0.5 mx-auto" />

      <div className="flex justify-center gap-1.5 mt-4">
        <button onClick={() => setSide("publisher")} className={`w-2 h-2 rounded-full ${side === "publisher" ? "bg-billboard-ink" : "bg-billboard-ink/25"}`} aria-label="Show publisher view" />
        <button onClick={() => setSide("business")} className={`w-2 h-2 rounded-full ${side === "business" ? "bg-billboard-ink" : "bg-billboard-ink/25"}`} aria-label="Show business view" />
      </div>
    </div>
  );
}

function ChannelTabsSection() {
  const { t } = useTranslation("home");
  const reveal = useReveal<HTMLDivElement>();
  return (
    <div ref={reveal.ref} className={reveal.className}>
      <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">{t("channelsSection.badge")}</span>
      <h2 className="text-3xl md:text-4xl mb-3 max-w-xl">{t("channelsSection.title")}</h2>
      <p className="text-billboard-inkSoft max-w-xl mb-8">{t("channelsSection.subtitle")}</p>
      <LiveChannelTabs />
    </div>
  );
}

/** Interactive mini-mockups replacing the numbered "3 steps" list. */
function HowItWorksMockups() {
  const { t } = useTranslation("home");
  const [active, setActive] = useState<0 | 1 | 2>(0);
  const scenes = [
    {
      title: t("howItWorks.scene1Title"),
      chip: t("howItWorks.scene1Chip"),
      body: (
        <div className="border-2 border-[#3A342B] rounded p-3.5 bg-[#211D17]">
          <div className="font-mono text-[10px] uppercase tracking-wider text-billboard-yellow mb-2">{t("howItWorks.scene1BrowseLabel")}</div>
          <div className="flex gap-2 flex-wrap">
            {(t("howItWorks.categories", { returnObjects: true }) as string[]).map((c) => (
              <span key={c} className="font-mono text-[10px] border border-billboard-paperDim/40 text-billboard-paperDim rounded-full px-2 py-1">{c}</span>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: t("howItWorks.scene2Title"),
      chip: t("howItWorks.scene2Chip"),
      body: (
        <div className="border-2 border-[#3A342B] rounded p-3.5 bg-[#211D17] flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-billboard-paperDim">{t("howItWorks.scene2Status")}</span>
          <span className="font-mono text-[10px] font-bold uppercase bg-billboard-yellow text-billboard-ink border border-billboard-ink rounded-full px-2 py-1 shrink-0">{t("howItWorks.scene2Pending")}</span>
        </div>
      ),
    },
    {
      title: t("howItWorks.scene3Title"),
      chip: t("howItWorks.scene3Chip"),
      body: (
        <div className="border-2 border-[#3A342B] rounded p-3.5 bg-[#211D17] flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-billboard-green flex items-center justify-center text-white text-sm shrink-0">✓</span>
          <span className="font-mono text-[10px] text-billboard-paperDim">{t("howItWorks.scene3Status")}</span>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = window.setInterval(() => setActive((a) => ((a + 1) % 3) as 0 | 1 | 2), 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grid md:grid-cols-3 gap-5">
      {scenes.map((s, i) => (
        <button
          key={s.title}
          onClick={() => setActive(i as 0 | 1 | 2)}
          className={`text-left border-2 rounded p-5 transition-all ${active === i ? "border-billboard-yellow bg-[#252017]" : "border-[#3A342B] hover:border-billboard-paperDim/50"}`}
        >
          <span className="inline-block font-mono text-[10px] font-semibold uppercase tracking-wider text-billboard-yellow border border-billboard-yellow/50 rounded-full px-2 py-0.5 mb-3">{s.chip}</span>
          {s.body}
          <p className="text-sm text-billboard-paperDim mt-4">{s.title}</p>
        </button>
      ))}
    </div>
  );
}

/** The three-layer positioning: Agency / Marketplace / Network. */
function ThreeLayersSection() {
  const { t } = useTranslation("home");
  const reveal = useReveal<HTMLDivElement>();
  const layers = [
    { key: "agency", to: "/build-my-campaign", cta: t("layers.agencyCta") },
    { key: "marketplace", to: "/browse", cta: t("layers.marketplaceCta") },
    { key: "network", to: "/for-publishers", cta: t("layers.networkCta") },
  ] as const;
  return (
    <section className="py-20 bg-white border-b-[3px] border-billboard-ink">
      <div className="max-w-6xl mx-auto px-5" ref={reveal.ref}>
        <div className={reveal.className}>
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">{t("layers.badge")}</span>
          <h2 className="text-3xl md:text-4xl mb-3 max-w-xl">{t("layers.title")}</h2>
          <p className="text-billboard-inkSoft max-w-xl mb-10">{t("layers.subtitle")}</p>
          <div className="grid md:grid-cols-3 gap-5">
            {layers.map((l) => (
              <div key={l.key} className="border-[3px] border-billboard-ink rounded-lg p-6 bg-billboard-paperDim flex flex-col">
                <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-white px-2.5 py-1 rounded mb-4 self-start">
                  {t(`layers.${l.key}Badge`)}
                </span>
                <h3 className="font-display text-lg mb-2">{t(`layers.${l.key}Title`)}</h3>
                <p className="text-sm text-billboard-inkSoft mb-5 flex-1">{t(`layers.${l.key}Body`)}</p>
                <Link to={l.to} className="font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                  {l.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Dual entry point into the two audience-specific landing pages. */
function AudienceSplitSection() {
  const { t } = useTranslation("home");
  const reveal = useReveal<HTMLDivElement>();
  return (
    <section className="py-20 bg-billboard-ink border-b-[3px] border-billboard-ink">
      <div className="max-w-4xl mx-auto px-5" ref={reveal.ref}>
        <div className={reveal.className}>
          <h2 className="font-display text-xl md:text-2xl mb-8 text-billboard-paper text-center">{t("audienceSplit.heading")}</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <Link
              to="/for-businesses"
              className="group block border-[3px] border-billboard-ink rounded-lg p-7 bg-billboard-yellow transition hover:-translate-y-1 hover:shadow-block"
            >
              <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-white px-2.5 py-1 rounded mb-4">{t("audienceSplit.businessBadge")}</span>
              <h3 className="font-display text-lg mb-2">{t("audienceSplit.businessTitle")}</h3>
              <p className="text-sm text-billboard-inkSoft mb-4">{t("audienceSplit.businessBody")}</p>
              <span className="font-bold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">{t("audienceSplit.businessCta")}</span>
            </Link>
            <Link
              to="/for-publishers"
              className="group block border-[3px] border-billboard-ink rounded-lg p-7 bg-white transition hover:-translate-y-1 hover:shadow-block"
            >
              <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-billboard-paperDim px-2.5 py-1 rounded mb-4">{t("audienceSplit.publisherBadge")}</span>
              <h3 className="font-display text-lg mb-2">{t("audienceSplit.publisherTitle")}</h3>
              <p className="text-sm text-billboard-inkSoft mb-4">{t("audienceSplit.publisherBody")}</p>
              <span className="font-bold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">{t("audienceSplit.publisherCta")}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation(["home", "common"]);
  const [loaded, setLoaded] = useState(false);
  const featured = useReveal<HTMLDivElement>();
  const howReveal = useReveal<HTMLDivElement>();
  const slogan = useReveal<HTMLDivElement>();
  const { publishers, loading } = usePublishers();

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setLoaded(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <Seo title={t("seo.title")} description={t("seo.description")} />

      {/* HERO */}
      <section className="bg-billboard-yellow border-b-[3px] border-billboard-ink overflow-hidden py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <span className={`inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-billboard-paper px-3 py-1.5 rounded mb-5 transition-all duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-billboard-red" /> {t("hero.badge")}
            </span>
            <h1 className={`text-4xl md:text-6xl leading-[1.05] mb-5 transition-all duration-700 delay-100 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              {t("hero.title1")}<br />{t("hero.title2")}
            </h1>
            <p className={`text-lg text-billboard-inkSoft max-w-[46ch] mb-7 transition-all duration-700 delay-200 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              {t("hero.subtitle")}
            </p>
            <div className={`flex flex-col sm:flex-row flex-wrap items-start gap-3.5 transition-all duration-700 delay-300 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
              <Link to="/build-my-campaign" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-ink text-billboard-paper font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">{t("hero.ctaBuildCampaign")}</Link>
              <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-paper font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">{t("hero.ctaBrowseMarketplace")}</Link>
              <Link to="/register?role=publisher" className="inline-flex items-center gap-1 font-bold text-sm px-2 py-3 underline hover:no-underline">{t("hero.ctaJoinNetwork")}</Link>
            </div>
          </div>

          <div className={`flex flex-col items-center transition-all duration-[900ms] delay-300 ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
            <HeroMockups />
            <div className="grid grid-cols-2 gap-3 w-full max-w-[420px] mt-6">
              <MetricCounter target={150} suffix="+" label={t("metrics.businesses")} />
              <MetricCounter prefix="R" target={500000} suffix="+" label={t("metrics.paidOut")} />
              <MetricCounter target={3} suffix="x" label={t("metrics.avgBookings")} />
              <MetricCounter target={PROVINCE_COUNT} suffix="/9" label={t("metrics.provinces")} />
            </div>
          </div>
        </div>
      </section>

      {/* THREE LAYERS — the new positioning */}
      <ThreeLayersSection />

      {/* TRUSTED BY */}
      <TrustedByStrip />

      {/* AUDIENCE SPLIT — dedicated landing pages */}
      <AudienceSplitSection />

      {/* FEATURED PUBLISHERS */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <RecentlyViewedStrip />
          <div ref={featured.ref} className={featured.className}>
            <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">{t("featured.badge")}</span>
            <h2 className="text-3xl md:text-4xl mb-3 max-w-xl">{t("featured.title")}</h2>
            <p className="text-billboard-inkSoft max-w-xl mb-10">{t("featured.subtitle")}</p>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-busy="true" aria-label="Loading featured publishers">
              {[0, 1, 2, 3].map((i) => (
                <PublisherCardSkeleton key={i} />
              ))}
            </div>
          ) : publishers.length === 0 ? (
            <div className="border-[3px] border-dashed border-billboard-ink rounded">
              <EmptyState
                kind="list"
                title={t("featured.emptyTitle")}
                description={t("featured.emptyDescription")}
                compact
              />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {publishers.slice(0, 4).map((p) => <PublisherCard key={p.id} publisher={p} />)}
            </div>
          )}
          <div className="text-center mt-10">
            <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">{t("featured.viewAll")}</Link>
          </div>
        </div>
      </section>

      {/* NEW CHANNELS — TABBED */}
      <section className="py-20 bg-billboard-paperDim border-b-[3px] border-billboard-ink">
        <div className="max-w-6xl mx-auto px-5">
          <ChannelTabsSection />
        </div>
      </section>

      {/* VALUE PROP SLOGAN — marketplace vs social ads */}
      <section className="py-20 bg-billboard-green border-b-[3px] border-billboard-ink">
        <div className="max-w-4xl mx-auto px-5 text-center" ref={slogan.ref}>
          <div className={slogan.className}>
            <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink bg-white px-3 py-1.5 rounded mb-5">{t("valueProp.badge")}</span>
            <h2 className="font-display text-3xl md:text-5xl text-white leading-tight mb-5">
              {t("valueProp.title1")}<br />{t("valueProp.title2")}
            </h2>
            <p className="text-white/85 max-w-xl mx-auto text-lg">
              {t("valueProp.body")}
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS TEASER */}
      <section className="py-20 bg-billboard-ink text-billboard-paper border-y-[3px] border-billboard-ink">
        <div className="max-w-6xl mx-auto px-5">
          <div ref={howReveal.ref} className={howReveal.className}>
            <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-yellow text-billboard-yellow px-3 py-1.5 rounded mb-3">{t("howItWorks.badge")}</span>
            <h2 className="text-3xl md:text-4xl mb-8 max-w-xl">{t("howItWorks.title")}</h2>
            <HowItWorksMockups />
            <Link to="/how-it-works" className="inline-flex items-center gap-2 mt-8 border-[3px] border-billboard-paper font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">{t("howItWorks.cta")}</Link>
          </div>
        </div>
      </section>

      {/* HOW PAYMENT WORKS TEASER */}
      <section className="py-20 bg-white border-b-[3px] border-billboard-ink">
        <div className="max-w-6xl mx-auto px-5">
          <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">{t("payment.badge")}</span>
          <h2 className="text-3xl md:text-4xl mb-8 max-w-xl">{t("payment.title")}</h2>
          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <div className="border-[3px] border-billboard-ink rounded-lg p-5 bg-billboard-paperDim">
              <div className="font-display text-2xl mb-1">1 → 2</div>
              <p className="text-sm text-billboard-inkSoft">{t("payment.step1", { days: CREATOR_APPROVAL_WINDOW_DAYS })}</p>
            </div>
            <div className="border-[3px] border-billboard-ink rounded-lg p-5 bg-billboard-paperDim">
              <div className="font-display text-2xl mb-1">3 → 5</div>
              <p className="text-sm text-billboard-inkSoft">{t("payment.step2")}</p>
            </div>
            <div className="border-[3px] border-billboard-ink rounded-lg p-5 bg-billboard-paperDim">
              <div className="font-display text-2xl mb-1">6</div>
              <p className="text-sm text-billboard-inkSoft">{t("payment.step3", { hours: CREATOR_PAYOUT_WINDOW_HOURS, share: Math.round(PUBLISHER_SHARE * 100), commission: Math.round(PLATFORM_COMMISSION_RATE * 100) })}</p>
            </div>
          </div>
          <Link to="/how-payment-works" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition">{t("payment.cta")}</Link>
        </div>
      </section>

      {/* CASE STUDIES TEASER — clearly framed as illustrative, since we're pre-launch */}
      <section className="py-16 bg-billboard-paperDim border-b-[3px] border-billboard-ink">
        <div className="max-w-6xl mx-auto px-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">{t("caseStudies.badge")}</span>
            <h2 className="text-2xl md:text-3xl max-w-lg">{t("caseStudies.title")}</h2>
          </div>
          <Link to="/case-studies" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-x-0.5 hover:-translate-y-0.5 transition bg-white shrink-0">{t("caseStudies.cta")}</Link>
        </div>
      </section>
    </>
  );
}
