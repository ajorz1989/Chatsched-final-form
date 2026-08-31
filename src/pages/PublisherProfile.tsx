import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { usePublishers } from "../hooks/usePublishers";
import { useAuth } from "../hooks/useAuth";
import { useComparison } from "../contexts/ComparisonContext";
import { useSavedLists } from "../contexts/SavedListsContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { formatSupabaseError } from "../lib/supabaseErrors";
import SetupNotice from "../components/SetupNotice";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import ChannelRequestForm from "../components/ChannelRequestForm";
import { hasUsableBusinessSubscription } from "../lib/subscriptionGate";
import SubscriptionGateNotice from "../components/SubscriptionGateNotice";
import ResponseTimeBadge from "../components/ResponseTimeBadge";
import LastActiveBadge from "../components/LastActiveBadge";
import PortfolioGallery from "../components/PortfolioGallery";
import MarketplaceProfileView from "../components/MarketplaceProfileView";
import { formatCurrency } from "../lib/currency";
import RateCardDisplay from "../components/RateCardDisplay";
import PublisherCard from "../components/PublisherCard";
import EmptyState from "../components/EmptyState";
import Seo from "../components/Seo";
import { SkeletonBlock, SkeletonLine, SkeletonParagraph } from "../components/Skeleton";
import { LEVEL_META, scoreLabel } from "../lib/publisherDisplay";
import { getChannelBySlug } from "../lib/channelRegistry";
import { takeContentStudioDraft } from "../lib/contentStudioDraft";
import type { Review } from "../lib/types";

export default function PublisherProfile() {
  const { id } = useParams();
  const { publishers, loading } = usePublishers();
  const { user, profile } = useAuth();
  const { isComparing, togglePublisher, isFull } = useComparison();
  const { lists, addToList, createList, isInAnyList } = useSavedLists();

  const publisher = publishers.find(p => p.id === id);

  const [message, setMessage] = useState(() => takeContentStudioDraft() ?? "");
  const [reportOpen, setReportOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [subscribed, setSubscribed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (user) hasUsableBusinessSubscription(user.id).then(setSubscribed);
  }, [user]);

  // Save menu
  const [showSave, setShowSave] = useState(false);
  const [newListName, setNewListName] = useState("");
  const saveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;
    supabase
      .from("reviews")
      .select("*, business:profiles(full_name, company_name)")
      .eq("publisher_id", id)
      .eq("author_role", "business")
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data ?? []) as unknown as Review[]));
  }, [id]);

  useEffect(() => {
    if (!showSave) return;
    function onDown(e: MouseEvent) {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setShowSave(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSave]);

  // Logs a real profile-view event for the publisher's "traction" numbers
  // on their own dashboard — see PublisherDashboardView.tsx and
  // schema_phase37_profile_views.sql. Fire-and-forget: never blocks
  // rendering, and a failed insert (network hiccup, RLS edge case) just
  // means one missed count, not a broken page. Deliberately excludes:
  // the publisher viewing their own listing (RLS also blocks this, this
  // just avoids a doomed network call), and admin views, since those
  // aren't a business showing real interest.
  useEffect(() => {
    if (!id || !user || !publisher) return;
    if (profile?.role !== "business" && profile?.role !== "publisher") return;
    if (publisher.user_id === user.id) return;
    supabase.from("publisher_profile_views").insert({ publisher_id: id, viewer_id: user.id }).then(
      () => {},
      () => {} // duplicate-day or RLS no-op — not worth surfacing to the viewer either way
    );
  }, [id, user, profile?.role, publisher]);

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10" aria-busy="true" aria-label="Loading publisher profile">
        <SkeletonBlock className="h-40 mb-6" />
        <div className="flex items-center gap-3 mb-5">
          <SkeletonBlock className="h-16 w-16 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <SkeletonLine className="w-1/2 h-5" />
            <SkeletonLine className="w-1/3" />
          </div>
        </div>
        <SkeletonParagraph lines={4} />
      </div>
    );
  }

  if (!publisher) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl mb-3">Publisher not found</h1>
        <p className="text-billboard-inkSoft mb-6">This listing may have moved.</p>
        <Link to="/browse" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-3 rounded">← Back to Browse</Link>
      </div>
    );
  }

  // Full profiles (contact details, bio, availability, portfolio, reviews,
  // the request form) are only for signed-in business and publisher/creator
  // accounts. Anyone else — including signed-out visitors — sees the same
  // card-level info they'd get from Browse, plus a prompt to register.
  const isRegisteredViewer = !!user && (profile?.role === "business" || profile?.role === "publisher" || profile?.role === "admin");
  if (!isRegisteredViewer) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-14">
        <Seo
          title={`${publisher.name} · ChatSched`}
          description={`${publisher.name} in ${publisher.city}, ${publisher.province} — sign up to view the full profile.`}
        />
        <Link to="/browse" className="text-xs font-semibold underline text-billboard-inkSoft">← Back to Browse</Link>
        <div className="max-w-sm mx-auto mt-6 mb-8">
          <PublisherCard publisher={publisher} />
        </div>
        <div className="max-w-sm mx-auto mb-6">
          <Link
            to={`/login?next=${encodeURIComponent(`/messages?publisher=${publisher.id}`)}`}
            className="w-full inline-flex justify-center items-center gap-2 border-[3px] border-billboard-greenDeep bg-billboard-green text-white font-bold py-3 rounded hover:bg-billboard-greenDeep transition"
          >
            Contact Publisher
          </Link>
          <p className="text-[11px] text-center text-billboard-inkSoft mt-2">
            Opens ChatSched Messages — stays on the platform. Log in or create an account first.
          </p>
        </div>
        <div className="border-[3px] border-dashed border-billboard-ink rounded">
          <EmptyState
            kind="lock"
            title="Sign up to view the full profile"
            description="Full profiles — bio, availability, portfolio, reviews and direct messaging — are only visible to registered businesses and creators. It's free and takes a minute."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 bg-billboard-yellow border-[3px] border-billboard-ink font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm">
                  Create a free account
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 border-[3px] border-billboard-ink font-bold px-5 py-2.5 rounded hover:-translate-y-0.5 transition text-sm bg-white">
                  Log in
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const liveRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : publisher.rating;
  const liveReviewCount = reviews.length > 0 ? reviews.length : publisher.reviews;
  const comparing = isComparing(publisher.id);
  const saved = isInAnyList(publisher.id);

  // Is the logged-in user the owner of this publisher profile?
  const isOwner = profile?.role === "publisher" && publisher.user_id === user?.id;

  // The 4 request-flow channels replace the directory pricing + PayFast
  // request form with ChannelRequestForm (below). social-media — and any
  // legacy row with no channel_slug set — keeps this page's original
  // behavior completely unchanged.
  const channelDef = getChannelBySlug(publisher.channel_slug)?.definition;
  const isRequestFlowChannel = !!channelDef && channelDef.bookingFlow === "request";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !publisher) return;
    setSending(true);
    setFormError(null);
    const { data: inserted, error } = await supabase
      .from("requests")
      .insert({ publisher_id: publisher.id, business_id: user.id, campaign_message: message, budget: budget ? Number(budget) : null })
      .select()
      .single();
    setSending(false);
    if (error) setFormError(error.message);
    else {
      setSent(true);
      if (inserted) supabase.functions.invoke("notify", { body: { kind: "new_request", request_id: inserted.id } }).catch(() => {});
    }
  }

  function handleSaveToNewList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const id2 = createList(newListName);
    addToList(id2, publisher!.id);
    setNewListName("");
    setShowSave(false);
  }

  return (
    <div>
      <Seo
        title={`${publisher.name} · ChatSched`}
        description={`${publisher.name} in ${publisher.city}, ${publisher.province} — ${publisher.followers.toLocaleString()} followers, ${formatCurrency(publisher.price_per_post)}/post. ${publisher.bio}`.slice(0, 160)}
      />
      <div className={`h-56 md:h-64 bg-gradient-to-br ${publisher.swatch} border-b-[3px] border-billboard-ink`} />

      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-col md:flex-row gap-8 -mt-12 mb-10">
          <div className="w-24 h-24 rounded-full bg-billboard-yellow border-[3px] border-billboard-ink flex items-center justify-center font-display text-xl shrink-0 shadow-block bg-white">
            {publisher.initials}
          </div>
          <div className="flex-1 pt-2 md:pt-14">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl">{publisher.name}</h1>
              {publisher.verified && (
                <span className="bg-billboard-ink text-white text-[11px] font-mono font-semibold px-2 py-1 rounded">✓ Verified</span>
              )}
              {publisher.level && (
                <span className="bg-billboard-ink text-white text-[11px] font-mono font-semibold px-2 py-1 rounded">
                  {LEVEL_META[publisher.level].emoji} {LEVEL_META[publisher.level].label}
                </span>
              )}
            </div>
            <p className="text-billboard-inkSoft mb-2">
              {publisher.city}{publisher.suburb ? ` (${publisher.suburb})` : ""}, {publisher.province} · {publisher.category}
              {isRequestFlowChannel && channelDef && (
                <span className="ml-1.5 font-mono text-xs uppercase text-billboard-greenDeep">· {channelDef.emoji} {channelDef.name}</span>
              )}
            </p>
            {(publisher.trust_score > 0 || publisher.publisher_score > 0 || publisher.avg_response_hours != null || publisher.last_active_at) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-billboard-inkSoft mb-3">
                {publisher.trust_score > 0 && (
                  <span>
                    {"⭐".repeat(Math.round(publisher.trust_score / 20))}{"☆".repeat(5 - Math.round(publisher.trust_score / 20))} Trust {publisher.trust_score}/100
                  </span>
                )}
                {publisher.publisher_score > 0 && (
                  <span className="font-mono uppercase">Publisher Score: {scoreLabel(publisher.publisher_score)}</span>
                )}
                <ResponseTimeBadge avgResponseHours={publisher.avg_response_hours} responseCount={publisher.response_count} />
                <LastActiveBadge lastActiveAt={publisher.last_active_at} />
              </div>
            )}

            {/* Compare + Save actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => togglePublisher(publisher.id)}
                disabled={!comparing && isFull}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border-2 transition ${
                  comparing
                    ? "border-billboard-green bg-billboard-green text-white"
                    : "border-billboard-ink hover:bg-billboard-paperDim disabled:opacity-40"
                }`}
              >
                {comparing ? "✓ In comparison" : isFull ? "Comparison full" : "⊞ Compare"}
              </button>
              {comparing && (
                <Link to="/compare" className="text-xs font-semibold underline text-billboard-green">View comparison →</Link>
              )}

              {/* Save dropdown */}
              <div className="relative" ref={saveRef}>
                <button
                  onClick={() => setShowSave(s => !s)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border-2 transition ${
                    saved
                      ? "border-billboard-yellow bg-billboard-yellow text-billboard-ink"
                      : "border-billboard-ink hover:bg-billboard-paperDim"
                  }`}
                >
                  {saved ? "★ Saved to list" : "☆ Save to list"}
                </button>
                {showSave && (
                  <div className="absolute top-full mt-1 left-0 z-30 w-56 bg-white border-[3px] border-billboard-ink rounded shadow-block overflow-hidden">
                    {lists.length > 0 && (
                      <div className="max-h-40 overflow-y-auto">
                        {lists.map(list => (
                          <button
                            key={list.id}
                            onClick={() => { addToList(list.id, publisher.id); setShowSave(false); }}
                            className="w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-billboard-paperDim border-b border-billboard-paperDim last:border-0 truncate"
                          >
                            {list.publisherIds.includes(publisher.id) ? "✓ " : "+ "}{list.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <form onSubmit={handleSaveToNewList} className={`p-2.5 ${lists.length > 0 ? "border-t-2 border-billboard-paperDim" : ""}`}>
                      <p className="text-[10px] font-mono uppercase text-billboard-inkSoft mb-1.5">New list</p>
                      <input
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                        placeholder="e.g. Winter Campaign"
                        className="w-full border-2 border-billboard-ink rounded px-2 py-1.5 text-xs mb-2 bg-white"
                        autoFocus={lists.length === 0}
                      />
                      <button type="submit" className="w-full bg-billboard-yellow border-2 border-billboard-ink font-bold text-xs py-1.5 rounded">
                        Create & save
                      </button>
                    </form>
                    <Link to="/lists" onClick={() => setShowSave(false)} className="block text-center text-[10px] font-mono uppercase text-billboard-inkSoft py-2 hover:bg-billboard-paperDim border-t border-billboard-paperDim">
                      Manage lists →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-10 pb-20">
          {/* ── Left column ── */}
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              {publisher.platforms.map(p => (
                <span key={p} className="font-mono text-xs border-2 border-billboard-ink rounded-full px-3 py-1 bg-billboard-paperDim">{p}</span>
              ))}
              {publisher.languages?.length > 0 && publisher.languages.map(l => (
                <span key={l} className="font-mono text-xs border-2 border-billboard-inkSoft rounded-full px-3 py-1 bg-white text-billboard-inkSoft">{l}</span>
              ))}
            </div>

            <PortfolioGallery introVideoUrl={publisher.intro_video_url} images={publisher.portfolio_images} />

            <h2 className="font-display text-lg mb-2">About this page</h2>
            <p className="text-billboard-inkSoft mb-8 leading-relaxed">{publisher.bio}</p>

            <MarketplaceProfileView publisher={publisher} liveRating={liveRating} liveReviewCount={liveReviewCount} />
            {publisher.monthly_reach != null && (
              <div className="border-2 border-billboard-ink rounded p-4 mb-4">
                <div className="font-display text-xl">{publisher.monthly_reach.toLocaleString()}</div>
                <div className="text-xs font-mono uppercase text-billboard-inkSoft mt-1">Monthly reach</div>
              </div>
            )}
            {publisher.ai_audience_summary && (
              <div className="border-2 border-billboard-green rounded p-4 mb-4 bg-[#EAF3EC]">
                <p className="font-mono text-[10px] uppercase text-billboard-greenDeep font-semibold mb-1">Audience summary — from verified follower data</p>
                <p className="text-sm text-billboard-inkSoft">{publisher.ai_audience_summary}</p>
              </div>
            )}
            <p className="text-sm text-billboard-inkSoft mb-8">Audience: {publisher.audience}</p>

            {/* Availability calendar */}
            <div className="mb-8">
              <h2 className="font-display text-lg mb-1">Availability</h2>
              <p className="text-sm text-billboard-inkSoft mb-3">
                {isOwner
                  ? "Click dates to mark them as unavailable. Businesses can see this before requesting."
                  : "Check availability before sending a campaign request."}
              </p>
              <AvailabilityCalendar publisherId={publisher.id} canEdit={isOwner} />
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <>
                <h2 className="font-display text-lg mb-3 mt-8">What businesses say</h2>
                <div className="space-y-4">
                  {reviews.map(rev => (
                    <div key={rev.id} className="border-2 border-billboard-ink rounded p-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm">{rev.business?.company_name || rev.business?.full_name || "A business"}</span>
                        <span className="text-billboard-yellow text-sm">{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</span>
                      </div>
                      {rev.communication_rating != null && (
                        <p className="text-[11px] font-mono uppercase text-billboard-inkSoft mb-1.5">
                          Communication {rev.communication_rating} · Professionalism {rev.professionalism_rating} · Quality {rev.quality_rating} · Timeliness {rev.timeliness_rating} · Value {rev.value_rating}
                        </p>
                      )}
                      {rev.comment && <p className="text-sm text-billboard-inkSoft">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="border-[3px] border-billboard-ink rounded p-6 h-fit bg-billboard-paperDim sticky top-24">
            {isRequestFlowChannel ? (
              <>
                <div className="font-display text-lg font-bold text-billboard-greenDeep mb-1">Pricing varies</div>
                <div className="text-xs text-billboard-inkSoft mb-5">Propose your budget in the request below — minimum recommended is R{channelDef?.minBudgetZAR.toLocaleString()}.</div>
              </>
            ) : (
              <RateCardDisplay publisherId={publisher.id} fallbackPrice={publisher.price_per_post} />
            )}

            {/* Media kit */}
            <div className="mb-5">
              <Link
                to={`/media-kit?publisher=${publisher.id}`}
                className="w-full inline-flex justify-center items-center gap-2 border-[3px] border-billboard-ink font-bold py-2.5 rounded hover:-translate-y-0.5 transition text-sm bg-white"
              >
                📄 Download Media Kit
              </Link>
            </div>

            {isRequestFlowChannel ? (
              <ChannelRequestForm publisher={publisher} />
            ) : sent ? (
              <div className="border-2 border-billboard-greenDeep bg-[#EAF3EC] text-billboard-greenDeep rounded p-4 text-sm font-semibold">
                Request sent — our team reviews every request by hand and will follow up by email, usually within a day or two. Track it from your dashboard.
              </div>
            ) : !user ? (
              <div className="border-2 border-billboard-ink rounded p-4 mb-3 bg-white">
                <p className="text-sm mb-3">Log in to request a campaign with {publisher.name}.</p>
                <Link to="/login" className="w-full inline-flex justify-center bg-billboard-yellow border-[3px] border-billboard-ink font-bold py-2.5 rounded hover:-translate-y-0.5 transition">Log in</Link>
                <p className="text-xs text-billboard-inkSoft mt-2">New here? <Link to="/register" className="underline font-semibold">Create a business account</Link></p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mb-3">
                {subscribed === false && <SubscriptionGateNotice role="business" />}
                <fieldset disabled={subscribed === false} className="border-0 p-0 m-0 min-w-0 disabled:opacity-50">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">What's the campaign?</label>
                <textarea
                  required value={message} onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="e.g. A launch post for our new winter menu, some time in the next two weeks"
                  className="w-full border-2 border-billboard-ink rounded px-3 py-2 mb-3 bg-white text-sm"
                />
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Budget (optional)</label>
                <input
                  type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="R"
                  className="w-full border-2 border-billboard-ink rounded px-3 py-2 mb-3 bg-white text-sm"
                />
                {formError && <p className="text-billboard-red text-xs font-semibold mb-3">{formError}</p>}
                <p className="text-xs text-billboard-inkSoft mb-3">Our team reviews every request by hand before anything's confirmed or paid — no money changes hands at this step.</p>
                <button type="submit" disabled={sending} className="w-full bg-billboard-yellow border-[3px] border-billboard-ink font-bold py-3 rounded hover:-translate-y-0.5 transition disabled:opacity-60">
                  {sending ? "Sending…" : "Request a campaign"}
                </button>
                </fieldset>
              </form>
            )}

            {!isOwner && (profile?.role === "business" || profile?.role === "admin") && (
              <div className="mt-3">
                <Link
                  to={`/messages?publisher=${publisher.id}`}
                  className="w-full inline-flex justify-center items-center gap-2 border-[3px] border-billboard-greenDeep bg-billboard-green text-white font-bold py-3 rounded hover:bg-billboard-greenDeep transition"
                >
                  Contact Publisher
                </Link>
                <p className="text-[11px] text-center text-billboard-inkSoft mt-2">
                  Opens ChatSched Messages — stays on the platform.
                </p>
              </div>
            )}

            {user && profile?.role === "business" && (
              <button
                onClick={() => setReportOpen(true)}
                className="w-full text-center text-xs text-billboard-inkSoft underline mt-3 hover:text-billboard-red transition"
              >
                Report this publisher
              </button>
            )}
          </aside>
        </div>
      </div>

      {reportOpen && (
        <ReportPublisherModal
          publisherId={publisher.id}
          publisherName={publisher.name}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "fake_followers", label: "Fake followers / engagement" },
  { value: "no_response", label: "Not responding to requests" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "scam_or_fraud", label: "Scam or fraud" },
  { value: "other", label: "Other" },
];

function ReportPublisherModal({ publisherId, publisherName, onClose }: { publisherId: string; publisherName: string; onClose: () => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      setError("You need to be logged in to report a publisher.");
      return;
    }
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: user.id,
      publisher_id: publisherId,
      reason,
      details: details.trim() || null,
    });
    setSending(false);
    if (insertError) {
      setError(formatSupabaseError(insertError, "Couldn't send that report"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="fixed inset-0 bg-billboard-ink/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border-[3px] border-billboard-ink rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h3 className="font-display text-lg mb-2">Report sent</h3>
            <p className="text-sm text-billboard-inkSoft mb-5">Thanks — an admin will review it. This publisher won't be told who reported them.</p>
            <button onClick={onClose} className="w-full border-[3px] border-billboard-ink font-bold py-2.5 rounded hover:-translate-y-0.5 transition">Close</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3 className="font-display text-lg mb-1">Report {publisherName}</h3>
            <p className="text-sm text-billboard-inkSoft mb-4">This goes to ChatSched admin only — the publisher won't see who filed it.</p>

            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border-2 border-billboard-ink rounded px-3 py-2 text-sm mb-3 bg-white">
              {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Details (optional)</label>
            <textarea
              value={details} onChange={(e) => setDetails(e.target.value)} rows={3}
              placeholder="Anything that would help admin look into this"
              className="w-full border-2 border-billboard-ink rounded px-3 py-2 text-sm mb-4"
            />

            {error && <p className="text-billboard-red text-xs font-semibold mb-3">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={sending} className="flex-1 bg-billboard-yellow border-[3px] border-billboard-ink font-bold py-2.5 rounded hover:-translate-y-0.5 transition disabled:opacity-60">
                {sending ? "Sending…" : "Send report"}
              </button>
              <button type="button" onClick={onClose} className="border-[3px] border-billboard-ink font-bold px-4 rounded hover:-translate-y-0.5 transition">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
