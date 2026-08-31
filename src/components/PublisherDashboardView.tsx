import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "./Button";
import { formatCurrency } from "../lib/currency";
import { supabase } from "../lib/supabase";
import { LEVEL_META, scoreLabel } from "../lib/publisherDisplay";
import { computeVerificationLevel, VERIFICATION_META } from "../lib/businessVerification";
import { getChannelBySlug } from "../lib/channelRegistry";
import { calculateSuggestedPrice, MIN_PRICE_PER_POST } from "../lib/pricingEngine";
import { buildAndDownloadInvoice } from "../lib/invoice";
import { CREATOR_APPROVAL_WINDOW_DAYS, CREATOR_PAYOUT_WINDOW_HOURS, PLATFORM_COMMISSION_RATE, PLACEMENT_TYPES, recommendedPlacementTypes, CATEGORIES, PROVINCES, SA_SUBURBS_AUTOCOMPLETE, CONTACT_ADDRESS_LINES } from "../lib/constants";
import { hasUsablePublisherSubscription } from "../lib/subscriptionGate";
import SubscriptionGateNotice from "./SubscriptionGateNotice";
import MessageThread from "./MessageThread";
import DisputeSection from "./DisputeSection";
import CampaignComplianceStrip from "./CampaignComplianceStrip";
import OnboardingChecklist from "./OnboardingChecklist";
import PortfolioManager from "./PortfolioManager";
import CreatorHomeSummary from "./CreatorHomeSummary";
import MarketplaceProfileView from "./MarketplaceProfileView";
import { computePublisherChecklist } from "../lib/onboardingChecklist";
import { SkeletonBlock, SkeletonLine, StatCardGridSkeleton, SkeletonRows } from "./Skeleton";
import EmptyState from "./EmptyState";
import ConnectSocialAccounts from "./ConnectSocialAccounts";
import PublisherTractionPanel from "./PublisherTractionPanel";
import RateCardManager from "./RateCardManager";
import ContentApprovalPanel from "./ContentApprovalPanel";
import { invalidatePublishersCache } from "../hooks/usePublishers";
import type { Publisher, PublisherRequest, RequestStatus, ChannelRequest, ChannelRequestStatus } from "../lib/types";

const STATUS_STYLE: Record<RequestStatus, string> = {
  pending: "bg-billboard-paperDim text-billboard-inkSoft border-billboard-inkSoft",
  contacted: "bg-billboard-yellow text-billboard-ink border-billboard-ink",
  confirmed: "bg-billboard-green text-white border-billboard-greenDeep",
  declined: "bg-white text-billboard-red border-billboard-red",
  completed: "bg-billboard-ink text-white border-billboard-ink",
};

const CHANNEL_REQUEST_STATUS_STYLE: Record<ChannelRequestStatus, string> = {
  pending: "bg-billboard-paperDim text-billboard-inkSoft border-billboard-inkSoft",
  countered: "bg-billboard-yellow text-billboard-ink border-billboard-ink",
  declined: "bg-white text-billboard-red border-billboard-red",
  cancelled: "bg-white text-billboard-red border-billboard-red",
  awaiting_payment: "bg-billboard-yellow text-billboard-ink border-billboard-ink",
  payment_submitted: "bg-billboard-yellow text-billboard-ink border-billboard-ink",
  paid: "bg-billboard-green text-white border-billboard-greenDeep",
  live: "bg-billboard-green text-white border-billboard-greenDeep",
  completed: "bg-billboard-ink text-white border-billboard-ink",
};

const CHANNEL_REQUEST_STATUS_LABEL: Record<ChannelRequestStatus, string> = {
  pending: "Awaiting your response",
  countered: "Waiting on business to accept your counter",
  declined: "Declined",
  cancelled: "Cancelled",
  awaiting_payment: "Awaiting business payment",
  payment_submitted: "Payment reported — confirming",
  paid: "Paid — ready to go live",
  live: "Live — payout due",
  completed: "Paid out",
};

export default function PublisherDashboardView() {
  const { user, profile } = useAuth();
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [requests, setRequests] = useState<PublisherRequest[]>([]);
  const [channelRequests, setChannelRequests] = useState<ChannelRequest[]>([]);
  const [connectedPlatformCount, setConnectedPlatformCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const connectResult = searchParams.get("connect") ? {
    status: searchParams.get("status"),
    platform: searchParams.get("platform"),
    followers: searchParams.get("followers"),
    message: searchParams.get("message"),
  } : null;
  const [tab, setTab] = useState<"requests" | "listing">("requests");

  const channelDef = publisher ? getChannelBySlug(publisher.channel_slug)?.definition : undefined;
  const isRequestFlowChannel = channelDef?.bookingFlow === "request";

  async function load() {
    if (!user) return;
    const { data: pub } = await supabase.from("publishers").select("*").eq("user_id", user.id).maybeSingle();
    setPublisher((pub ?? null) as Publisher | null);
    if (pub) {
      // Just the count, for the onboarding checklist's "Connect a social
      // account" step — ConnectSocialAccounts.tsx below owns the full
      // per-platform stats and re-fetches them itself, so this doesn't
      // duplicate that; publisher_platform_stats is publicly readable
      // (unlike social_connections, locked to service-role only — see
      // schema_phase34_social_connect.sql), so a plain client select is
      // fine here.
      const { count } = await supabase
        .from("publisher_platform_stats")
        .select("id", { count: "exact", head: true })
        .eq("publisher_id", pub.id);
      setConnectedPlatformCount(count ?? 0);

      const pubChannelDef = getChannelBySlug((pub as Publisher).channel_slug)?.definition;
      if (pubChannelDef?.bookingFlow === "request") {
        const { data: creqs } = await supabase
          .from("channel_requests")
          .select("*, business:profiles(full_name, company_name, phone)")
          .eq("creator_id", pub.id)
          .order("created_at", { ascending: false });
        setChannelRequests((creqs ?? []) as unknown as ChannelRequest[]);
      } else {
        const { data: reqs } = await supabase
          .from("requests")
          .select("*, business:profiles(full_name, company_name, email_verified, phone_verified, business_verified), payments(*), reviews(*)")
          .eq("publisher_id", pub.id)
          .order("created_at", { ascending: false });
        setRequests((reqs ?? []) as unknown as PublisherRequest[]);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-14" aria-busy="true" aria-label="Loading dashboard">
        <SkeletonLine className="w-64 h-8 mb-2" />
        <SkeletonLine className="w-40 mb-6" />
        <StatCardGridSkeleton count={3} />
        <SkeletonBlock className="h-16 mt-6 mb-6" />
        <SkeletonRows count={3} />
      </div>
    );
  }

  if (!publisher) {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl mb-3">Finish your application.</h1>
        <p className="text-billboard-inkSoft mb-8">You're signed up, but there's no application on file yet.</p>
        <Link to="/apply" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink bg-billboard-ink text-billboard-paper font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition">
          Continue application →
        </Link>
      </div>
    );
  }

  if (publisher.status === "pending_review") {
    return (
      <div className="max-w-lg mx-auto px-5 py-16 text-center">
        <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-inkSoft text-billboard-inkSoft px-3 py-1.5 rounded mb-4">Pending review</span>
        <h1 className="text-2xl mb-3">Your application's with us.</h1>
        <p className="text-billboard-inkSoft mb-10">We review every publisher by hand — we'll email you either way. In the meantime, connecting your accounts below gives us real numbers to review instead of self-reported ones, which tends to speed things up.</p>
        {connectResult && (
          <div className={`border-2 rounded p-3 mb-6 text-sm flex items-center justify-between gap-3 text-left ${connectResult.status === "success" ? "border-billboard-green bg-[#EAF3EC]" : "border-billboard-red bg-billboard-red/10"}`}>
            <p>
              {connectResult.status === "success"
                ? `Connected — imported ${Number(connectResult.followers ?? 0).toLocaleString()} followers from ${connectResult.platform}.`
                : connectResult.message || "Couldn't finish connecting that platform."}
            </p>
            <button onClick={() => setSearchParams({})} className="text-xs font-bold underline shrink-0">Dismiss</button>
          </div>
        )}
        <div className="text-left">
          <ConnectSocialAccounts publisherId={publisher.id} />
        </div>
      </div>
    );
  }

  if (publisher.status === "rejected") {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-4">Not approved</span>
        <h1 className="text-2xl mb-3">Your application wasn't approved.</h1>
        {publisher.rejected_reason && <p className="text-billboard-inkSoft mb-2">{publisher.rejected_reason}</p>}
        <p className="text-billboard-inkSoft">Get in touch if you think this was a mistake or something's changed since you applied.</p>
      </div>
    );
  }

  if (publisher.status === "suspended") {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-4">Suspended</span>
        <h1 className="text-2xl mb-3">Your listing is suspended.</h1>
        <p className="text-billboard-inkSoft">You won't appear in the directory while this is in place. Get in touch for details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-3">Your dashboard</span>

      <CreatorHomeSummary
        firstName={profile?.full_name ? profile.full_name.split(" ")[0] : null}
        publisher={publisher}
        isRequestFlowChannel={isRequestFlowChannel}
        requests={requests}
        channelRequests={channelRequests}
        connectedPlatformCount={connectedPlatformCount}
      />

      {/* CHANNEL_UPDATES_AUDIT.md's own remaining gap: "the publisher's own
          dashboard still shows the same view regardless of channel." Closed
          by reusing MarketplaceProfileView itself here — not a second,
          separately-built dashboard-specific system, which is what Core
          Requirement 3's own language ("one dynamic content-rendering
          system") actually asked for. Same component a visiting business
          sees on /browse/:id, so a publisher gets to see exactly what their
          own channel-specific stats/badges look like to someone deciding
          whether to book them. No extra fetch — publisher.rating/reviews
          are already loaded on the same object CreatorHomeSummary above
          uses, same fallback PublisherProfile.tsx itself uses when it has
          no separately-fetched reviews array. */}
      <div className="mb-10 border-[3px] border-billboard-ink rounded p-5">
        <h2 className="font-bold text-sm mb-1">How your listing looks to businesses</h2>
        <p className="text-xs text-billboard-inkSoft mb-4">
          The same audience stats and badges shown on your public profile.
        </p>
        <MarketplaceProfileView publisher={publisher} liveRating={publisher.rating} liveReviewCount={publisher.reviews} />
      </div>

      <p className="text-sm text-billboard-inkSoft -mt-2 mb-4">
        <Link to="/account" className="font-semibold underline">Manage account & data →</Link>
      </p>

      {connectResult && (
        <div className={`border-2 rounded p-3 mb-6 text-sm flex items-center justify-between gap-3 ${connectResult.status === "success" ? "border-billboard-green bg-[#EAF3EC]" : "border-billboard-red bg-billboard-red/10"}`}>
          <p>
            {connectResult.status === "success"
              ? `Connected — imported ${Number(connectResult.followers ?? 0).toLocaleString()} followers from ${connectResult.platform}.`
              : connectResult.message || "Couldn't finish connecting that platform."}
          </p>
          <button onClick={() => setSearchParams({})} className="text-xs font-bold underline shrink-0">Dismiss</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {publisher.level && (
          <span className="bg-billboard-ink text-white text-xs font-mono font-semibold px-2.5 py-1.5 rounded">
            {LEVEL_META[publisher.level].emoji} {LEVEL_META[publisher.level].label}
          </span>
        )}
        {publisher.trust_score > 0 && (
          <span className="text-sm text-billboard-inkSoft">
            {"⭐".repeat(Math.round(publisher.trust_score / 20))}{"☆".repeat(5 - Math.round(publisher.trust_score / 20))} Trust {publisher.trust_score}/100
          </span>
        )}
        {publisher.publisher_score > 0 && (
          <span className="text-xs font-mono uppercase text-billboard-inkSoft">Publisher Score: {scoreLabel(publisher.publisher_score)}</span>
        )}
        <Link to="/messages" className="text-xs font-semibold underline text-billboard-inkSoft">
          Messages
        </Link>
        <Link to={`/browse/${publisher.id}`} className="ml-auto text-xs font-semibold underline text-billboard-inkSoft">
          View your public listing →
        </Link>
      </div>

      {/* Two tabs, not one long scroll: "Requests" is almost always why
          someone opened this page, so it's the default and it's short —
          a returning publisher shouldn't have to pass six setup panels to
          see whether anyone's requested them. Everything about shaping
          the listing itself (profile, portfolio, pricing, formats, the
          getting-started checklist) lives in "Manage listing" instead. */}
      {(() => {
        const checklistItems = user
          ? computePublisherChecklist(publisher, isRequestFlowChannel, requests, channelRequests, connectedPlatformCount)
          : [];
        const checklistRemaining = checklistItems.filter((i) => !i.done).length;
        const activeRequestCount = requests.length + channelRequests.filter((r) => r.status !== "cancelled" && r.status !== "declined").length;

        return (
          <>
            <div className="flex gap-2 border-b-2 border-billboard-paperDim mb-6">
              <button
                onClick={() => setTab("requests")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-[3px] -mb-0.5 transition ${tab === "requests" ? "border-billboard-ink text-billboard-ink" : "border-transparent text-billboard-inkSoft hover:text-billboard-ink"}`}
              >
                Requests{activeRequestCount > 0 ? ` (${activeRequestCount})` : ""}
              </button>
              <button
                onClick={() => setTab("listing")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-[3px] -mb-0.5 transition ${tab === "listing" ? "border-billboard-ink text-billboard-ink" : "border-transparent text-billboard-inkSoft hover:text-billboard-ink"}`}
              >
                Manage listing{checklistRemaining > 0 ? ` (${checklistRemaining} to finish)` : ""}
              </button>
            </div>

            {tab === "requests" ? (
              <>
                {checklistRemaining > 0 && (
                  <button
                    onClick={() => setTab("listing")}
                    className="w-full text-left border-2 border-billboard-yellow bg-billboard-yellow/10 rounded p-3 mb-6 text-sm hover:bg-billboard-yellow/20 transition"
                  >
                    <span className="font-semibold">{checklistRemaining} setup step{checklistRemaining === 1 ? "" : "s"} left</span>
                    <span className="text-billboard-inkSoft"> — finishing these tends to get you more requests. Manage listing →</span>
                  </button>
                )}

                <PublisherTractionPanel publisherId={publisher.id} totalRequests={activeRequestCount} />

                <h2 className="font-display text-lg mb-4">Requests</h2>
                {isRequestFlowChannel ? (
                  channelRequests.length === 0 ? (
                    <div className="border-[3px] border-dashed border-billboard-ink rounded">
                      <EmptyState
                        kind="inbox"
                        title="No requests yet"
                        description="Approved creators show up in Browse and on your channel page, and businesses request you straight from your profile."
                        compact
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {channelRequests.map((r) => <ChannelRequestCard key={r.id} request={r} onChange={load} />)}
                    </div>
                  )
                ) : requests.length === 0 ? (
                  <div className="border-[3px] border-dashed border-billboard-ink rounded">
                    <EmptyState
                      kind="inbox"
                      title="No requests yet"
                      description="Approved publishers show up in Browse, and businesses request you straight from there."
                      compact
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((r) => <PublisherRequestCard key={r.id} request={r} publisher={publisher} onChange={load} />)}
                  </div>
                )}
              </>
            ) : (
              <>
                {user && (
                  <OnboardingChecklist
                    title="Getting started"
                    items={checklistItems}
                    storageKey={`cs_onboarding_publisher_${user.id}`}
                  />
                )}

                <div className="mb-10">
                  <ConnectSocialAccounts publisherId={publisher.id} />
                </div>

                <ProfileEditPanel publisher={publisher} onChange={load} />

                <PortfolioManager publisher={publisher} onChange={load} />

                <PricingPanel publisher={publisher} onChange={load} />

                {/* Placement formats only apply to the social-media channel — other
                    channels (podcast, radio, website, influencer) have no equivalent
                    "post format" concept. */}
                {publisher.channel_slug === "social-media" && (
                  <PlacementTypesPanel publisher={publisher} onChange={load} />
                )}

                {/* Ad formats for the 4 request-flow channels — website, radio,
                    influencer, podcast — mirrors the same set of options shown to
                    businesses on the campaign request form (ChannelRequestForm). */}
                {isRequestFlowChannel && channelDef?.advertisingMethods && channelDef.advertisingMethods.length > 0 && (
                  <AdFormatsPanel publisher={publisher} methods={channelDef.advertisingMethods} channelName={channelDef.name} onChange={load} />
                )}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}

function ProfileEditPanel({ publisher, onChange }: { publisher: Publisher; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(publisher.name);
  const [category, setCategory] = useState(publisher.category);
  const [province, setProvince] = useState(publisher.province);
  const [city, setCity] = useState(publisher.city);
  const [suburb, setSuburb] = useState(publisher.suburb ?? "");
  const [bio, setBio] = useState(publisher.bio);
  const [audience, setAudience] = useState(publisher.audience);
  const [mobileNumber, setMobileNumber] = useState(publisher.mobile_number ?? "");
  const [businessName, setBusinessName] = useState(publisher.business_name ?? "");
  const [companyRegistration, setCompanyRegistration] = useState(publisher.company_registration ?? "");
  const [vatNumber, setVatNumber] = useState(publisher.vat_number ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setName(publisher.name);
    setCategory(publisher.category);
    setProvince(publisher.province);
    setCity(publisher.city);
    setSuburb(publisher.suburb ?? "");
    setBio(publisher.bio);
    setAudience(publisher.audience);
    setMobileNumber(publisher.mobile_number ?? "");
    setBusinessName(publisher.business_name ?? "");
    setCompanyRegistration(publisher.company_registration ?? "");
    setVatNumber(publisher.vat_number ?? "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!name.trim() || !province.trim() || !city.trim()) {
      setError("Name, province and city can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("publishers").update({
      name: name.trim(),
      category,
      province,
      city,
      suburb: suburb || null,
      bio,
      audience,
      mobile_number: mobileNumber || null,
      business_name: businessName || null,
      company_registration: companyRegistration || null,
      vat_number: vatNumber || null,
    }).eq("id", publisher.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidatePublishersCache();
    setEditing(false);
    onChange();
  }

  const fieldClass = "w-full border-2 border-billboard-ink rounded px-2.5 py-2 text-sm bg-white";
  const labelClass = "block text-xs font-semibold mb-1";

  return (
    <div className="border-[3px] border-billboard-ink rounded p-5 mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-display text-lg">Your profile</h2>
        {!editing && (
          <button onClick={startEditing} className="text-xs font-semibold underline text-billboard-inkSoft">
            Edit profile
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-2 text-sm text-billboard-inkSoft space-y-1">
          <p><span className="font-semibold text-billboard-ink">{publisher.name}</span> · {publisher.category}</p>
          <p>{publisher.city}{publisher.suburb ? `, ${publisher.suburb}` : ""}, {publisher.province}</p>
          {publisher.bio && <p className="max-w-lg">{publisher.bio}</p>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <label className={labelClass}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Province</label>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={fieldClass}>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Suburb (optional)</label>
            <input value={suburb} onChange={(e) => setSuburb(e.target.value)} list="profile-suburb-options" className={fieldClass} />
            <datalist id="profile-suburb-options">
              {SA_SUBURBS_AUTOCOMPLETE.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Contact number</label>
            <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className={fieldClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Who's your audience?</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} className={fieldClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Business name (optional)</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Company registration (optional)</label>
            <input value={companyRegistration} onChange={(e) => setCompanyRegistration(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>VAT number (optional)</label>
            <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={fieldClass} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-sm font-semibold text-billboard-inkSoft">Cancel</button>
          </div>
          {error && <p className="text-billboard-red text-xs font-semibold sm:col-span-2">{error}</p>}
        </div>
      )}
    </div>
  );
}

function PricingPanel({ publisher, onChange }: { publisher: Publisher; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(publisher.price_per_post));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestion = calculateSuggestedPrice({
    followers: publisher.followers,
    engagement: publisher.engagement,
    trustScore: publisher.trust_score,
    monthlyReach: publisher.monthly_reach,
  });

  async function save() {
    const price = Number(value);
    if (!price || price < MIN_PRICE_PER_POST) {
      setError(`Price must be at least ${formatCurrency(MIN_PRICE_PER_POST)}.`);
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("publishers").update({ price_per_post: price }).eq("id", publisher.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidatePublishersCache();
    setEditing(false);
    onChange();
  }

  return (
    <div className="border-[3px] border-billboard-ink rounded p-5 mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-display text-lg">Your pricing</h2>
        {!editing && (
          <button onClick={() => { setValue(String(publisher.price_per_post)); setEditing(true); }} className="text-xs font-semibold underline text-billboard-inkSoft">
            Edit price
          </button>
        )}
      </div>

      {!editing ? (
        <p className="font-mono text-2xl font-bold text-billboard-greenDeep">R{publisher.price_per_post}<span className="text-sm font-sans font-normal text-billboard-inkSoft"> starting price</span></p>
      ) : (
        <div className="mt-3">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Starting price per post (ZAR)</label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input
              type="number" min={MIN_PRICE_PER_POST} value={value} onChange={(e) => setValue(e.target.value)}
              className="border-2 border-billboard-ink rounded px-3 py-2 bg-white text-sm w-40"
            />
            <button onClick={save} disabled={saving} className="border-[3px] border-billboard-ink bg-billboard-green text-white font-bold px-4 py-2 rounded text-sm hover:-translate-y-0.5 transition disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-sm font-semibold text-billboard-inkSoft">Cancel</button>
          </div>
          {error && <p className="text-billboard-red text-xs font-semibold mb-2">{error}</p>}
          <p className="text-xs text-billboard-inkSoft">
            Suggested price based on your current followers, engagement, and trust score: <strong className="text-billboard-greenDeep">R{suggestion.suggested}</strong>{" "}
            <span>(typically R{suggestion.low}–R{suggestion.high}) — a guide, not a rule.</span>
          </p>
        </div>
      )}

      <div className="mt-5 pt-5 border-t-2 border-billboard-paperDim">
        <h3 className="text-sm font-semibold mb-1">Rate card</h3>
        <p className="text-xs text-billboard-inkSoft mb-3">
          Optional — break your pricing down by format (Story, Feed post, Reel, a bundle) instead of one number. Once you add an item, the starting price above updates automatically to match your cheapest one, and businesses see the full breakdown on your profile.
        </p>
        <RateCardManager publisherId={publisher.id} onChange={onChange} />
      </div>
    </div>
  );
}

function PlacementTypesPanel({ publisher, onChange }: { publisher: Publisher; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(publisher.placement_types ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = recommendedPlacementTypes(publisher.platforms);

  function toggle(t: string) {
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("publishers").update({ placement_types: selected.length > 0 ? selected : null }).eq("id", publisher.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidatePublishersCache();
    setEditing(false);
    onChange();
  }

  return (
    <div className="border-[3px] border-billboard-ink rounded p-5 mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-display text-lg">Placement types you offer</h2>
        {!editing && (
          <button onClick={() => { setSelected(publisher.placement_types ?? []); setEditing(true); }} className="text-xs font-semibold underline text-billboard-inkSoft">
            Edit formats
          </button>
        )}
      </div>

      {!editing ? (
        publisher.placement_types && publisher.placement_types.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {publisher.placement_types.map((t) => (
              <span key={t} className="text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink bg-billboard-green">{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-billboard-inkSoft mt-1">Not set yet — add the formats you post so businesses know what to request.</p>
        )
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {PLACEMENT_TYPES.map((t) => {
              const isRecommended = recommended.includes(t);
              return (
                <button
                  type="button" key={t} onClick={() => toggle(t)}
                  className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${selected.includes(t) ? "bg-billboard-green" : isRecommended ? "bg-billboard-yellow/40" : "bg-billboard-paper"}`}
                >
                  {t}{isRecommended && !selected.includes(t) ? " ★" : ""}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="border-[3px] border-billboard-ink bg-billboard-green text-white font-bold px-4 py-2 rounded text-sm hover:-translate-y-0.5 transition disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-sm font-semibold text-billboard-inkSoft">Cancel</button>
          </div>
          {error && <p className="text-billboard-red text-xs font-semibold mt-2">{error}</p>}
          {publisher.platforms.length > 0 && (
            <p className="text-xs text-billboard-inkSoft mt-2">★ = typical formats for your listed platform(s) — a starting point, pick whatever you actually post.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AdFormatsPanel({ publisher, methods, channelName, onChange }: { publisher: Publisher; methods: { id: string; label: string; description: string }[]; channelName: string; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(publisher.accepted_ad_formats ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(label: string) {
    setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("publishers").update({ accepted_ad_formats: selected.length > 0 ? selected : null }).eq("id", publisher.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    invalidatePublishersCache();
    setEditing(false);
    onChange();
  }

  return (
    <div className="border-[3px] border-billboard-ink rounded p-5 mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="font-display text-lg">{channelName} formats you offer</h2>
        {!editing && (
          <button onClick={() => { setSelected(publisher.accepted_ad_formats ?? []); setEditing(true); }} className="text-xs font-semibold underline text-billboard-inkSoft">
            Edit formats
          </button>
        )}
      </div>

      {!editing ? (
        publisher.accepted_ad_formats && publisher.accepted_ad_formats.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {publisher.accepted_ad_formats.map((m) => (
              <span key={m} className="text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink bg-billboard-green">{m}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-billboard-inkSoft mt-1">Not set yet — every format is shown to businesses by default until you narrow it down here.</p>
        )
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {methods.map((m) => (
              <button
                type="button" key={m.id} onClick={() => toggle(m.label)}
                title={m.description}
                className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${selected.includes(m.label) ? "bg-billboard-green" : "bg-billboard-paper"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="border-[3px] border-billboard-ink bg-billboard-green text-white font-bold px-4 py-2 rounded text-sm hover:-translate-y-0.5 transition disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-sm font-semibold text-billboard-inkSoft">Cancel</button>
          </div>
          {error && <p className="text-billboard-red text-xs font-semibold mt-2">{error}</p>}
          <p className="text-xs text-billboard-inkSoft mt-2">Leave everything unchecked to show businesses the full standard list instead.</p>
        </div>
      )}
    </div>
  );
}

function PublisherRequestCard({ request: r, publisher, onChange }: { request: PublisherRequest; publisher: Publisher | null; onChange: () => void }) {
  const payment = [...(r.payments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const review = r.reviews?.find((rev) => rev.author_role === "publisher");
  const businessLevel = r.business ? computeVerificationLevel(r.business) : null;

  return (
    <div className="border-[3px] border-billboard-ink rounded p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold">
            {r.business?.company_name || r.business?.full_name || "A business"}
            {businessLevel && (
              <span className="ml-2 font-mono text-[10px] uppercase text-billboard-inkSoft">
                {VERIFICATION_META[businessLevel].emoji} {VERIFICATION_META[businessLevel].label}
              </span>
            )}
          </p>
          <p className="text-sm text-billboard-inkSoft mt-1 max-w-md">{r.campaign_message}</p>
          {r.agreed_amount != null && <p className="text-xs text-billboard-inkSoft mt-1 font-mono">Agreed: R{r.agreed_amount}</p>}
        </div>
        <span className={`inline-block font-mono text-xs font-semibold uppercase px-3 py-1.5 rounded border-2 shrink-0 ${STATUS_STYLE[r.status]}`}>
          {r.status}
        </span>
      </div>

      {payment?.status === "paid" && publisher && (
        <div className="mt-4 pt-4 border-t-2 border-billboard-paperDim flex flex-wrap items-center gap-3">
          <p className="text-sm text-billboard-inkSoft">
            {payment.payout_status === "paid"
              ? `✓ Paid out${payment.payout_date ? ` ${new Date(payment.payout_date).toLocaleDateString()}` : ""}`
              : "Payout pending — sent once the business's payment clears."}
          </p>
          <Button size="sm" onClick={() => downloadPublisherInvoice(r, payment, publisher)}>
            Download Invoice
          </Button>
        </div>
      )}

      {r.status === "completed" && (
        <div className="mt-4 pt-4 border-t-2 border-billboard-paperDim">
          {review ? (
            <p className="text-sm text-billboard-inkSoft">You rated this business {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
          ) : (
            <PublisherReviewForm request={r} onDone={onChange} />
          )}
        </div>
      )}

      <Link to={`/campaigns/${r.id}`} className="inline-block font-mono text-[10px] font-semibold uppercase text-billboard-inkSoft underline mt-3">
        Open campaign workspace →
      </Link>
      <CampaignComplianceStrip campaignId={r.id} />
      <MessageThread requestId={r.id} senderRole="publisher" />
      {(r.status === "confirmed" || r.status === "completed") && <DisputeSection requestId={r.id} />}
    </div>
  );
}

function downloadPublisherInvoice(r: PublisherRequest, payment: NonNullable<PublisherRequest["payments"]>[number], publisher: Publisher) {
  const businessName = r.business?.company_name || r.business?.full_name || "A business";
  const invoiceNumber = `MB-${payment.id.slice(0, 8).toUpperCase()}`;
  const issueDate = new Date(payment.paid_at ?? payment.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  buildAndDownloadInvoice({
    invoiceNumber,
    issueDate,
    statusLabel: payment.payout_status === "paid"
      ? `Paid out${payment.payout_date ? ` on ${new Date(payment.payout_date).toLocaleDateString("en-ZA")}` : ""}`
      : "Payout pending — sent once the business's payment clears",
    billTo: { heading: "Payout to", lines: [publisher.name, `${publisher.city}, ${publisher.province}`] },
    from: { heading: "From", lines: ["ChatSched", ...CONTACT_ADDRESS_LINES] },
    description: `Campaign with ${businessName}`,
    channelLabel: publisher.category,
    grossAmount: payment.amount,
    showCommissionSplit: true,
    fileName: `payout-${invoiceNumber}`,
  });
}

function formatDue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const overdue = d.getTime() < Date.now();
  return `${d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}${overdue ? " (overdue)" : ""}`;
}

function ChannelRequestCard({ request: r, onChange }: { request: ChannelRequest; onChange: () => void }) {
  const { user } = useAuth();
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [subscribed, setSubscribed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (r.status === "pending" && user) hasUsablePublisherSubscription(user.id).then(setSubscribed);
  }, [r.status, user]);

  async function respond(newStatus: "awaiting_payment" | "declined") {
    setActing(true);
    setActionError(null);
    const { error } = await supabase.from("channel_requests").update({ status: newStatus }).eq("id", r.id);
    setActing(false);
    if (error) setActionError(error.message);
    else onChange();
  }

  async function submitCounter() {
    const amount = Number(counterAmount);
    if (!amount || amount <= 0) {
      setActionError("Enter a real amount to counter with.");
      return;
    }
    setActing(true);
    setActionError(null);
    const { error } = await supabase
      .from("channel_requests")
      .update({ status: "countered", counter_amount: amount, counter_note: counterNote.trim() || null })
      .eq("id", r.id);
    setActing(false);
    if (error) setActionError(error.message);
    else {
      setCountering(false);
      onChange();
    }
  }

  return (
    <div className="border-[3px] border-billboard-ink rounded p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-bold">{r.business?.company_name || r.business?.full_name || "A business"}</p>
          <p className="text-xs font-mono uppercase text-billboard-inkSoft mt-1">
            {r.advertising_method} · R{r.proposed_amount} proposed · you receive R{(r.proposed_amount * (1 - PLATFORM_COMMISSION_RATE)).toFixed(2)}
          </p>
          <p className="text-sm text-billboard-inkSoft mt-1 max-w-md">{r.campaign_message}</p>
        </div>
        <span className={`inline-block font-mono text-xs font-semibold uppercase px-3 py-1.5 rounded border-2 shrink-0 ${CHANNEL_REQUEST_STATUS_STYLE[r.status]}`}>
          {CHANNEL_REQUEST_STATUS_LABEL[r.status]}
        </span>
      </div>

      {actionError && <p className="text-billboard-red text-xs font-semibold mt-3">{actionError}</p>}

      {r.status === "pending" && (
        <div className="mt-4 pt-4 border-t-2 border-billboard-paperDim">
          <p className="text-xs text-billboard-inkSoft mb-3">
            Respond by {formatDue(r.approval_due_at)} ({CREATOR_APPROVAL_WINDOW_DAYS}-day window) — unanswered requests simply expire.
          </p>
          {subscribed === false && <SubscriptionGateNotice role="publisher" />}
          {!countering ? (
            <div className="flex gap-2 flex-wrap">
              {subscribed !== false && (
                <button onClick={() => respond("awaiting_payment")} disabled={acting} className="border-[3px] border-billboard-ink bg-billboard-green text-white font-bold px-4 py-2 rounded text-sm hover:-translate-y-0.5 transition disabled:opacity-60">
                  Approve at R{r.proposed_amount}
                </button>
              )}
              <button onClick={() => setCountering(true)} disabled={acting} className="border-[3px] border-billboard-ink bg-billboard-yellow font-bold px-4 py-2 rounded text-sm hover:-translate-y-0.5 transition disabled:opacity-60">
                Propose a different price
              </button>
              <button onClick={() => respond("declined")} disabled={acting} className="border-[3px] border-billboard-ink font-bold px-4 py-2 rounded text-sm hover:bg-billboard-paperDim transition disabled:opacity-60">
                Decline
              </button>
            </div>
          ) : (
            <div className="border-2 border-billboard-ink rounded p-3 bg-billboard-paperDim">
              <p className="text-xs font-semibold mb-2">One counter-offer — the business can accept or decline it, no further back-and-forth here (use messages for that).</p>
              <div className="flex gap-2 items-start flex-wrap mb-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-billboard-inkSoft mb-1">Your price (R)</label>
                  <input
                    type="number"
                    min="1"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder={String(r.proposed_amount)}
                    className="border-2 border-billboard-ink rounded px-2.5 py-1.5 text-sm w-28"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-mono uppercase text-billboard-inkSoft mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                    placeholder="e.g. happy to do this for R650 instead"
                    className="border-2 border-billboard-ink rounded px-2.5 py-1.5 text-sm w-full"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={submitCounter} disabled={acting} className="border-[3px] border-billboard-ink bg-billboard-green text-white font-bold px-3 py-1.5 rounded text-xs hover:-translate-y-0.5 transition disabled:opacity-60">
                  {acting ? "Sending…" : "Send counter-offer"}
                </button>
                <button onClick={() => { setCountering(false); setActionError(null); }} className="border-2 border-billboard-ink font-semibold px-3 py-1.5 rounded text-xs hover:bg-white transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {r.status === "countered" && (
        <div className="mt-4 pt-4 border-t-2 border-billboard-paperDim">
          <p className="text-sm text-billboard-inkSoft">
            You countered at <strong className="text-billboard-ink">R{r.counter_amount}</strong> — waiting on {formatDue(r.approval_due_at)} for the business to accept or let it lapse.
          </p>
          {r.counter_note && <p className="text-xs text-billboard-inkSoft mt-1 italic">"{r.counter_note}"</p>}
        </div>
      )}

      {r.status === "awaiting_payment" && (
        <p className="text-xs text-billboard-inkSoft mt-4 pt-4 border-t-2 border-billboard-paperDim">
          Waiting on the business to pay the platform — due {formatDue(r.payment_due_at)}. Nothing to do until then.
        </p>
      )}

      {r.status === "payment_submitted" && (
        <p className="text-xs text-billboard-inkSoft mt-4 pt-4 border-t-2 border-billboard-paperDim">
          The business reports payment sent — we're confirming funds landed. You'll be able to mark this live shortly.
        </p>
      )}

      {r.status === "paid" && (
        <div className="mt-4 pt-4 border-t-2 border-billboard-paperDim">
          <p className="text-xs text-billboard-inkSoft mb-3">
            Payment confirmed. Once your content is approved and {r.advertising_method.toLowerCase()} is live, mark it below — you'll be paid within {CREATOR_PAYOUT_WINDOW_HOURS} hours.
          </p>
          <ContentApprovalPanel
            channelRequestId={r.id}
            requestStatus={r.status}
            isCreator
            isBusiness={false}
            advertisingMethod={r.advertising_method}
            onPublished={onChange}
          />
        </div>
      )}

      {r.status === "live" && (
        <p className="text-xs text-billboard-inkSoft mt-4 pt-4 border-t-2 border-billboard-paperDim">
          Live since {formatDue(r.live_at)} — payout due by {formatDue(r.payout_due_at)}.
        </p>
      )}

      {r.status === "completed" && (
        <p className="text-xs text-billboard-inkSoft mt-4 pt-4 border-t-2 border-billboard-paperDim">
          ✓ Paid out{r.completed_at ? ` ${new Date(r.completed_at).toLocaleDateString()}` : ""}.
        </p>
      )}

      <Link to={`/campaigns/${r.id}`} className="inline-block font-mono text-[10px] font-semibold uppercase text-billboard-inkSoft underline mt-3">
        Open campaign workspace →
      </Link>
      <CampaignComplianceStrip campaignId={r.id} />
      <MessageThread channelRequestId={r.id} senderRole="publisher" />
      {r.status !== "pending" && r.status !== "countered" && r.status !== "cancelled" && <DisputeSection channelRequestId={r.id} />}
    </div>
  );
}

type RatingKey = "communication_rating" | "professionalism_rating" | "quality_rating" | "timeliness_rating" | "value_rating";

const RATING_CATEGORIES: { key: RatingKey; label: string }[] = [
  { key: "communication_rating", label: "Communication" },
  { key: "professionalism_rating", label: "Professionalism" },
  { key: "quality_rating", label: "Quality" },
  { key: "timeliness_rating", label: "Timeliness" },
  { key: "value_rating", label: "Value" },
];

function PublisherReviewForm({ request, onDone }: { request: PublisherRequest; onDone: () => void }) {
  const [ratings, setRatings] = useState<Partial<Record<RatingKey, number>>>({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const values = RATING_CATEGORIES.map((c) => ratings[c.key] ?? 0);
    if (values.some((v) => v === 0)) {
      setError("Rate all five before submitting.");
      return;
    }
    setSaving(true);
    setError(null);
    const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const { error } = await supabase.from("reviews").insert({
      request_id: request.id,
      publisher_id: request.publisher_id,
      business_id: request.business_id,
      author_role: "publisher",
      rating: overall,
      communication_rating: ratings.communication_rating,
      professionalism_rating: ratings.professionalism_rating,
      quality_rating: ratings.quality_rating,
      timeliness_rating: ratings.timeliness_rating,
      value_rating: ratings.value_rating,
      comment: comment || null,
    });
    setSaving(false);
    if (error) setError(error.message);
    else onDone();
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-2">
        How was working with {request.business?.company_name || request.business?.full_name || "this business"}?
      </p>
      <div className="space-y-1.5 mb-3">
        {RATING_CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3">
            <span className="text-xs font-mono uppercase text-billboard-inkSoft">{c.label}</span>
            <div className="flex gap-0.5 text-lg leading-none">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatings((r) => ({ ...r, [c.key]: n }))}
                  aria-label={`${c.label} ${n} star${n === 1 ? "" : "s"}`}
                  className="text-billboard-yellow"
                >
                  {n <= (ratings[c.key] ?? 0) ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Optional — what stood out?"
        className="w-full border-2 border-billboard-ink rounded px-3 py-2 mb-3 bg-white text-sm"
      />
      {error && <p className="text-billboard-red text-xs font-semibold mb-2">{error}</p>}
      <button onClick={submit} disabled={saving} className="border-[3px] border-billboard-ink font-bold px-4 py-2 rounded text-sm hover:-translate-y-0.5 transition disabled:opacity-60">
        {saving ? "Saving…" : "Submit review"}
      </button>
    </div>
  );
}
