import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { CATEGORIES, PROVINCES, PLATFORMS, PLACEMENT_TYPES, recommendedPlacementTypes, SA_SUBURBS_AUTOCOMPLETE, CREATOR_APPROVAL_WINDOW_DAYS, BUSINESS_PAYMENT_WINDOW_DAYS, CREATOR_PAYOUT_WINDOW_HOURS, PLATFORM_COMMISSION_RATE, PUBLISHER_SHARE } from "../lib/constants";
import { getChannelBySlug } from "../lib/channelRegistry";
import { calculateSuggestedPrice, MIN_PRICE_PER_POST } from "../lib/pricingEngine";
import type { ChannelSlug } from "../lib/channelTypes";
import type { Platform } from "../lib/types";
import type {
  PodcastOnboardingFields, InformalRetailOnboardingFields, SportsOnboardingFields,
  SocialMediaOnboardingFields, WebsiteOnboardingFields, InfluencerOnboardingFields, RadioOnboardingFields,
  EventsOnboardingFields, CommunityOnboardingFields, TransportOnboardingFields, AssociationsOnboardingFields, RestaurantsOnboardingFields,
} from "../lib/channelOnboardingSchemas";
import Seo from "../components/Seo";
import { formatCurrency } from "../lib/currency";

const DEFAULT_MIN_FOLLOWERS = 3000;
const DEFAULT_CHECKS = [
  "My page/profile is public",
  "My audience is primarily South African",
  "I've posted in the last 30 days",
];
const APPLY_CHANNEL_STORAGE_KEY = "mb_apply_channel";

type Step = "eligibility" | "details" | "social" | "business" | "review" | "submitted" | "ineligible";
const STEPS: Step[] = ["eligibility", "details", "social", "business", "review"];

interface FormState {
  followers: string;
  check1: boolean;
  check2: boolean;
  check3: boolean;
  name: string;
  province: string;
  city: string;
  suburb: string;
  platforms: Platform[];
  placementTypes: string[];
  adFormats: string[];
  category: string;
  engagement: string;
  monthlyReach: string;
  audience: string;
  bio: string;
  pricePerPost: string;
  accountAgeMonths: string;
  postingFrequency: string;
  businessName: string;
  companyRegistration: string;
  vatNumber: string;
  acceptedTerms: boolean;
  acceptedPaymentTerms: boolean;
  // Channel-specific extra fields — only meaningful for their one channel
  // each, left at initial values and simply not read on submit for any
  // other channel. Flat strings/booleans here even where the eventual
  // channel_metadata field is typed (e.g. numbers, arrays) — parsed into
  // shape in buildChannelMetadata() below, same pattern the rest of this
  // form already uses (form.followers is a string that becomes Number()
  // on submit) rather than a special case just for these three.
  podcastDownloads: string;
  podcastFrequency: string;
  podcastEpisodeLength: string;
  podcastHostingPlatform: string;
  podcastAdSlots: string[];
  podcastRegions: string;
  retailFootTraffic: string;
  retailTradingHours: string;
  retailHasTill: boolean;
  retailHasWhatsapp: boolean;
  retailWhatsappSize: string;
  retailLandmark: string;
  retailPriceMin: string;
  retailPriceMax: string;
  sportsSport: string;
  sportsLevel: string;
  sportsLeague: string;
  sportsSeason: string;
  sportsSquadSize: string;
  sportsAttendance: string;
  sportsVenue: string;
  sportsAuthorityRole: string;
  // The remaining 9 channels' extra fields — same flat-strings-parsed-on-
  // submit convention as the three above.
  smPrimaryPlatform: string;
  smSecondaryPlatforms: string[];
  smFollowerCounts: string; // "facebook:1200, instagram:3400" — parsed into Record<string,number> on submit
  smBestFormat: string;
  smPostsPerWeek: string;
  smAudienceCountry: string;
  webDomain: string;
  webMonthlyVisitors: string;
  webNiche: string;
  webCms: string;
  webPlacements: string[];
  webAvgSessionSeconds: string;
  infPrimaryPlatform: string;
  infNiche: string;
  infContentFormats: string[];
  infEngagementRate: string;
  infPastCollabs: string;
  infOffersUsageRights: boolean;
  radioStationName: string;
  radioFrequency: string;
  radioCoverageArea: string;
  radioLanguages: string; // comma-separated
  radioListenership: string;
  radioSlotLengths: string[];
  radioShowSponsorship: boolean;
  eventsName: string;
  eventsType: string;
  eventsFrequency: string;
  eventsAttendance: string;
  eventsNextDate: string;
  eventsTiers: string; // comma-separated
  eventsVenueCity: string;
  commGroupType: string;
  commMemberCount: string;
  commReachChannels: string[];
  commNewsletterFrequency: string;
  commGeographicArea: string;
  transOperatorType: string;
  transVehicleCount: string;
  transRoutes: string; // comma-separated
  transDailyPassengers: string;
  transPlacements: string[];
  transPrimaryRank: string;
  assocType: string;
  assocMemberCount: string;
  assocSectors: string; // comma-separated
  assocReachChannels: string[];
  assocHasDirectory: boolean;
  assocHostsEvents: boolean;
  restVenueType: string;
  restSeatingCapacity: string;
  restDailyCovers: string;
  restHasDigitalMenu: boolean;
  restPlacements: string[];
  restCuisineType: string;
}

const initialState: FormState = {
  followers: "", check1: false, check2: false, check3: false,
  name: "", province: "", city: "", suburb: "", platforms: [], placementTypes: [], adFormats: [], category: "", engagement: "", monthlyReach: "",
  audience: "", bio: "", pricePerPost: "", accountAgeMonths: "", postingFrequency: "",
  businessName: "", companyRegistration: "", vatNumber: "", acceptedTerms: false, acceptedPaymentTerms: false,
  podcastDownloads: "", podcastFrequency: "", podcastEpisodeLength: "", podcastHostingPlatform: "", podcastAdSlots: [], podcastRegions: "",
  retailFootTraffic: "", retailTradingHours: "", retailHasTill: false, retailHasWhatsapp: false, retailWhatsappSize: "", retailLandmark: "", retailPriceMin: "", retailPriceMax: "",
  sportsSport: "", sportsLevel: "", sportsLeague: "", sportsSeason: "", sportsSquadSize: "", sportsAttendance: "", sportsVenue: "", sportsAuthorityRole: "",
  smPrimaryPlatform: "", smSecondaryPlatforms: [], smFollowerCounts: "", smBestFormat: "", smPostsPerWeek: "", smAudienceCountry: "",
  webDomain: "", webMonthlyVisitors: "", webNiche: "", webCms: "", webPlacements: [], webAvgSessionSeconds: "",
  infPrimaryPlatform: "", infNiche: "", infContentFormats: [], infEngagementRate: "", infPastCollabs: "", infOffersUsageRights: false,
  radioStationName: "", radioFrequency: "", radioCoverageArea: "", radioLanguages: "", radioListenership: "", radioSlotLengths: [], radioShowSponsorship: false,
  eventsName: "", eventsType: "", eventsFrequency: "", eventsAttendance: "", eventsNextDate: "", eventsTiers: "", eventsVenueCity: "",
  commGroupType: "", commMemberCount: "", commReachChannels: [], commNewsletterFrequency: "", commGeographicArea: "",
  transOperatorType: "", transVehicleCount: "", transRoutes: "", transDailyPassengers: "", transPlacements: [], transPrimaryRank: "",
  assocType: "", assocMemberCount: "", assocSectors: "", assocReachChannels: [], assocHasDirectory: false, assocHostsEvents: false,
  restVenueType: "", restSeatingCapacity: "", restDailyCovers: "", restHasDigitalMenu: false, restPlacements: [], restCuisineType: "",
};

/**
 * Builds the typed channel_metadata payload for every channel — see
 * channelOnboardingSchemas.ts for the full set of 12 typed shapes (closed
 * this session; see CHANNEL_UPDATES_AUDIT.md for the history of which
 * three were done first and why).
 */
function buildChannelMetadata(channelSlug: ChannelSlug, form: FormState): Record<string, unknown> | null {
  if (channelSlug === "podcast") {
    const fields: PodcastOnboardingFields = {
      averageDownloadsPerEpisode: Number(form.podcastDownloads) || 0,
      episodeFrequency: (form.podcastFrequency || "irregular") as PodcastOnboardingFields["episodeFrequency"],
      averageEpisodeLengthMinutes: Number(form.podcastEpisodeLength) || 0,
      hostingPlatform: form.podcastHostingPlatform,
      adSlotsAvailable: form.podcastAdSlots as PodcastOnboardingFields["adSlotsAvailable"],
      topListenerRegions: form.podcastRegions.split(",").map((r) => r.trim()).filter(Boolean),
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "informal-retail") {
    const fields: InformalRetailOnboardingFields = {
      estimatedDailyFootTraffic: Number(form.retailFootTraffic) || 0,
      tradingHours: form.retailTradingHours,
      hasElectronicTill: form.retailHasTill,
      hasWhatsappBroadcastList: form.retailHasWhatsapp,
      whatsappBroadcastListSize: form.retailHasWhatsapp ? Number(form.retailWhatsappSize) || 0 : null,
      nearbyLandmark: form.retailLandmark,
      priceRangeZAR: { min: Number(form.retailPriceMin) || 150, max: Number(form.retailPriceMax) || 150 },
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "sports") {
    const fields: SportsOnboardingFields = {
      sport: form.sportsSport,
      competitionLevel: (form.sportsLevel || "amateur") as SportsOnboardingFields["competitionLevel"],
      league: form.sportsLeague,
      season: form.sportsSeason,
      squadSize: Number(form.sportsSquadSize) || 0,
      averageMatchdayAttendance: form.sportsAttendance ? Number(form.sportsAttendance) : null,
      homeVenue: form.sportsVenue,
      sponsorshipAuthorityRole: (form.sportsAuthorityRole || "administrator") as SportsOnboardingFields["sponsorshipAuthorityRole"],
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "social-media") {
    const followerCountByPlatform: Record<string, number> = {};
    form.smFollowerCounts.split(",").forEach((pair) => {
      const [k, v] = pair.split(":").map((s) => s.trim());
      if (k && v) followerCountByPlatform[k] = Number(v) || 0;
    });
    const fields: SocialMediaOnboardingFields = {
      primaryPlatform: (form.smPrimaryPlatform || "facebook") as SocialMediaOnboardingFields["primaryPlatform"],
      secondaryPlatforms: form.smSecondaryPlatforms as SocialMediaOnboardingFields["secondaryPlatforms"],
      followerCountByPlatform,
      bestPerformingFormat: (form.smBestFormat || "static_post") as SocialMediaOnboardingFields["bestPerformingFormat"],
      postsPerWeek: Number(form.smPostsPerWeek) || 0,
      audienceCountry: form.smAudienceCountry || "South Africa",
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "website") {
    const fields: WebsiteOnboardingFields = {
      domain: form.webDomain,
      monthlyUniqueVisitors: Number(form.webMonthlyVisitors) || 0,
      niche: form.webNiche,
      cms: form.webCms,
      placementsAvailable: form.webPlacements as WebsiteOnboardingFields["placementsAvailable"],
      averageSessionDurationSeconds: form.webAvgSessionSeconds ? Number(form.webAvgSessionSeconds) : null,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "influencer") {
    const fields: InfluencerOnboardingFields = {
      primaryPlatform: (form.infPrimaryPlatform || "instagram") as InfluencerOnboardingFields["primaryPlatform"],
      niche: (form.infNiche || "general_lifestyle") as InfluencerOnboardingFields["niche"],
      contentFormats: form.infContentFormats as InfluencerOnboardingFields["contentFormats"],
      averageEngagementRatePercent: Number(form.infEngagementRate) || 0,
      pastBrandCollaborations: Number(form.infPastCollabs) || 0,
      offersUsageRights: form.infOffersUsageRights,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "radio") {
    const fields: RadioOnboardingFields = {
      stationName: form.radioStationName,
      frequencyOrStream: form.radioFrequency,
      coverageArea: form.radioCoverageArea,
      broadcastLanguages: form.radioLanguages.split(",").map((l) => l.trim()).filter(Boolean),
      averageDailyListenership: form.radioListenership ? Number(form.radioListenership) : null,
      availableSlotLengths: form.radioSlotLengths.map((s) => Number(s)) as RadioOnboardingFields["availableSlotLengths"],
      showSponsorshipAvailable: form.radioShowSponsorship,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "events") {
    const fields: EventsOnboardingFields = {
      eventName: form.eventsName,
      eventType: (form.eventsType || "community_gathering") as EventsOnboardingFields["eventType"],
      frequency: (form.eventsFrequency || "annual") as EventsOnboardingFields["frequency"],
      typicalAttendance: Number(form.eventsAttendance) || 0,
      nextEventDate: form.eventsNextDate || null,
      sponsorshipTiersOffered: form.eventsTiers.split(",").map((t) => t.trim()).filter(Boolean),
      venueCity: form.eventsVenueCity,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "community") {
    const fields: CommunityOnboardingFields = {
      groupType: (form.commGroupType || "hobby_or_interest_group") as CommunityOnboardingFields["groupType"],
      memberCount: Number(form.commMemberCount) || 0,
      reachChannels: form.commReachChannels as CommunityOnboardingFields["reachChannels"],
      newsletterFrequency: (form.commNewsletterFrequency || "none") as CommunityOnboardingFields["newsletterFrequency"],
      geographicArea: form.commGeographicArea,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "transport") {
    const fields: TransportOnboardingFields = {
      operatorType: (form.transOperatorType || "individual_owner") as TransportOnboardingFields["operatorType"],
      vehicleCount: Number(form.transVehicleCount) || 0,
      routesCovered: form.transRoutes.split(",").map((r) => r.trim()).filter(Boolean),
      estimatedDailyPassengers: form.transDailyPassengers ? Number(form.transDailyPassengers) : null,
      placementTypesAvailable: form.transPlacements as TransportOnboardingFields["placementTypesAvailable"],
      primaryRank: form.transPrimaryRank,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "associations") {
    const fields: AssociationsOnboardingFields = {
      associationType: (form.assocType || "networking_group") as AssociationsOnboardingFields["associationType"],
      memberCount: Number(form.assocMemberCount) || 0,
      sectorsRepresented: form.assocSectors.split(",").map((s) => s.trim()).filter(Boolean),
      reachChannels: form.assocReachChannels as AssociationsOnboardingFields["reachChannels"],
      hasMemberDirectory: form.assocHasDirectory,
      hostsRegularEvents: form.assocHostsEvents,
    };
    return fields as unknown as Record<string, unknown>;
  }
  if (channelSlug === "restaurants") {
    const fields: RestaurantsOnboardingFields = {
      venueType: (form.restVenueType || "sit_down_restaurant") as RestaurantsOnboardingFields["venueType"],
      seatingCapacity: form.restSeatingCapacity ? Number(form.restSeatingCapacity) : null,
      estimatedDailyCovers: Number(form.restDailyCovers) || 0,
      hasDigitalMenu: form.restHasDigitalMenu,
      placementTypesAvailable: form.restPlacements as RestaurantsOnboardingFields["placementTypesAvailable"],
      cuisineType: form.restCuisineType,
    };
    return fields as unknown as Record<string, unknown>;
  }
  return null;
}

const inputClass = "w-full border-2 border-billboard-ink rounded px-3 py-2.5";
const labelClass = "block text-sm font-semibold mb-1.5";
const continueClass = "bg-billboard-yellow border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition";
const backClass = "font-bold px-5 py-3";

export default function PublisherApply() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Which channel is this application for? URL param wins; falls back to
  // whatever Register.tsx stashed in sessionStorage when the applicant
  // clicked "Apply as a creator" on a channel page before signing up (that
  // context would otherwise be lost across the register → login → apply
  // hop, since RequireAuth doesn't carry a return-to destination).
  const paramChannel = searchParams.get("channel") as ChannelSlug | null;
  const storedChannel = (typeof window !== "undefined" ? sessionStorage.getItem(APPLY_CHANNEL_STORAGE_KEY) : null) as ChannelSlug | null;
  const channelSlug: ChannelSlug = paramChannel || storedChannel || "social-media";
  const channelModule = getChannelBySlug(channelSlug) ?? getChannelBySlug("social-media")!;
  const ch = channelModule.definition;
  const isRequestFlow = ch.bookingFlow === "request";

  const minMetric = isRequestFlow && ch.eligibility ? ch.eligibility.minValue : DEFAULT_MIN_FOLLOWERS;
  const metricLabel = isRequestFlow && ch.eligibility ? ch.eligibility.metricLabel : "Follower count";
  const checks = isRequestFlow && ch.eligibility ? ch.eligibility.checks : DEFAULT_CHECKS;

  const [step, setStep] = useState<Step>("eligibility");
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stepIndex = STEPS.indexOf(step);
  const progressPct = step === "submitted" || step === "ineligible" ? 100 : ((stepIndex + 1) / STEPS.length) * 100;

  function togglePlatform(p: Platform) {
    update("platforms", form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p]);
  }

  function togglePlacementType(t: string) {
    update("placementTypes", form.placementTypes.includes(t) ? form.placementTypes.filter((x) => x !== t) : [...form.placementTypes, t]);
  }

  function toggleAdFormat(label: string) {
    update("adFormats", form.adFormats.includes(label) ? form.adFormats.filter((x) => x !== label) : [...form.adFormats, label]);
  }

  // Social media placement selector only makes sense for the social-media
  // channel — the other channels (podcast, radio, website, influencer) have
  // their own booking flow and no equivalent "post format" concept.
  const showPlacementTypes = channelSlug === "social-media";
  const recommendedTypes = recommendedPlacementTypes(form.platforms);

  function checkEligibility() {
    const metric = Number(form.followers);
    if (!metric || metric < minMetric || !form.check1 || !form.check2 || !form.check3) {
      setStep("ineligible");
      return;
    }
    setStep("details");
  }

  async function submitApplication() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("publishers").insert({
      user_id: user.id,
      email: user.email,
      name: form.name || profile?.full_name || "",
      mobile_number: profile?.phone ?? null,
      province: form.province,
      city: form.city,
      suburb: form.suburb || null,
      channel_slug: channelSlug,
      channel_metadata: buildChannelMetadata(channelSlug, form),
      platforms: form.platforms,
      placement_types: form.placementTypes.length > 0 ? form.placementTypes : null,
      accepted_ad_formats: form.adFormats.length > 0 ? form.adFormats : null,
      category: form.category,
      followers: Number(form.followers),
      engagement: Number(form.engagement) || 0,
      monthly_reach: Number(form.monthlyReach) || null,
      audience: form.audience,
      bio: form.bio,
      account_age_months: Number(form.accountAgeMonths) || null,
      posting_frequency: form.postingFrequency,
      business_name: form.businessName || null,
      company_registration: form.companyRegistration || null,
      vat_number: form.vatNumber || null,
      status: "pending_review",
      price_per_post: Number(form.pricePerPost) || MIN_PRICE_PER_POST,
      initials: (form.name || profile?.full_name || "?").slice(0, 2).toUpperCase(),
      swatch: "from-billboard-green to-billboard-greenDeep",
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (typeof window !== "undefined") sessionStorage.removeItem(APPLY_CHANNEL_STORAGE_KEY);
    setStep("submitted");
  }

  if (step === "ineligible") {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <Seo title="Creator Application · ChatSched" noindex />
        <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-red text-billboard-red px-3 py-1.5 rounded mb-4">Not quite yet</span>
        <h1 className="text-2xl md:text-3xl mb-3">Not quite eligible yet.</h1>
        <p className="text-billboard-inkSoft mb-8">
          To apply for {ch.name}, you'll need at least {minMetric.toLocaleString()} {metricLabel.toLowerCase()}, and
          all three checks above. Keep growing and come back — we'd love to have you.
        </p>
        <button onClick={() => setStep("eligibility")} className={continueClass}>Check again</button>
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <span className="inline-block font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-greenDeep text-billboard-greenDeep px-3 py-1.5 rounded mb-4">Submitted</span>
        <h1 className="text-2xl md:text-3xl mb-3">Application submitted.</h1>
        <p className="text-billboard-inkSoft mb-8">
          You're in <strong>Pending Review</strong>. We review every {isRequestFlow ? "creator" : "publisher"} by hand before they go live —
          we'll be in touch by email either way.
        </p>
        <p className="text-billboard-inkSoft mb-8">
          Next: connect your social account from your dashboard — it imports your real follower count automatically instead of relying on what you typed above, and tends to speed up review.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-billboard-yellow border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition">
            Connect your accounts →
          </Link>
          <button onClick={() => navigate("/")} className="border-[3px] border-billboard-ink bg-billboard-ink text-billboard-paper font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <Seo title={`${isRequestFlow ? "Creator" : "Publisher"} Application · ChatSched`} noindex />

      {isRequestFlow && (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider uppercase border-2 border-billboard-ink px-3 py-1.5 rounded mb-4">
          {ch.emoji} Applying to {ch.name}
        </span>
      )}

      <div className="h-2 border-2 border-billboard-ink rounded mb-8 overflow-hidden">
        <div className="h-full bg-billboard-green transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {error && <p className="text-billboard-red text-sm font-semibold mb-4">{error}</p>}

      {step === "eligibility" && (
        <div className="border-[3px] border-billboard-ink rounded p-6 space-y-4">
          <h1 className="text-2xl mb-1">Let's check you're eligible.</h1>
          <div>
            <label className={labelClass}>{metricLabel}</label>
            <input type="number" value={form.followers} onChange={(e) => update("followers", e.target.value)} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.check1} onChange={(e) => update("check1", e.target.checked)} />
            {checks[0]}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.check2} onChange={(e) => update("check2", e.target.checked)} />
            {checks[1]}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.check3} onChange={(e) => update("check3", e.target.checked)} />
            {checks[2]}
          </label>
          <button onClick={checkEligibility} className={continueClass}>Continue</button>
        </div>
      )}

      {step === "details" && (
        <div className="border-[3px] border-billboard-ink rounded p-6 space-y-4">
          <h1 className="text-2xl mb-1">Where are you based?</h1>
          <div>
            <label className={labelClass}>{isRequestFlow ? `${ch.name} name` : "Page/account name"}</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Province</label>
            <select value={form.province} onChange={(e) => update("province", e.target.value)} className={inputClass}>
              <option value="">Select a province</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input value={form.city} onChange={(e) => update("city", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Suburb <span className="font-normal text-billboard-inkSoft">(optional)</span></label>
            <input
              value={form.suburb}
              onChange={(e) => update("suburb", e.target.value)}
              list="suburb-options"
              placeholder="e.g. Sandton"
              className={inputClass}
            />
            <datalist id="suburb-options">
              {SA_SUBURBS_AUTOCOMPLETE.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("eligibility")} className={backClass}>Back</button>
            <button onClick={() => setStep("social")} className={continueClass}>Continue</button>
          </div>
        </div>
      )}

      {step === "social" && (
        <div className="border-[3px] border-billboard-ink rounded p-6 space-y-4">
          <h1 className="text-2xl mb-1">Tell us about your {isRequestFlow ? ch.name.toLowerCase() : "page"}.</h1>
          <div>
            <label className={labelClass}>{isRequestFlow ? "Social presence (optional)" : "Platform(s)"}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button type="button" key={p} onClick={() => togglePlatform(p)}
                  className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.platforms.includes(p) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {showPlacementTypes && (
            <div>
              <label className={labelClass}>Which placement types do you offer?</label>
              <p className="text-xs text-billboard-inkSoft mb-2">Select every format you're happy to post — businesses can request any of these once you're approved.</p>
              <div className="flex flex-wrap gap-2">
                {PLACEMENT_TYPES.map((t) => {
                  const recommended = recommendedTypes.includes(t);
                  return (
                    <button
                      type="button" key={t} onClick={() => togglePlacementType(t)}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.placementTypes.includes(t) ? "bg-billboard-green" : recommended ? "bg-billboard-yellow/40" : "bg-billboard-paper"}`}
                    >
                      {t}{recommended && !form.placementTypes.includes(t) ? " ★" : ""}
                    </button>
                  );
                })}
              </div>
              {form.platforms.length > 0 && (
                <p className="text-xs text-billboard-inkSoft mt-1.5">★ = typical formats for the platform(s) you picked above — just a starting point, pick whatever you actually post.</p>
              )}
            </div>
          )}
          {isRequestFlow && ch.advertisingMethods && ch.advertisingMethods.length > 0 && (
            <div>
              <label className={labelClass}>Which {ch.name.toLowerCase()} formats do you offer?</label>
              <p className="text-xs text-billboard-inkSoft mb-2">Check off everything you're willing to run — businesses will only be able to request formats you've selected here.</p>
              <div className="flex flex-wrap gap-2">
                {ch.advertisingMethods.map((m) => (
                  <button
                    type="button" key={m.id} onClick={() => toggleAdFormat(m.label)}
                    title={m.description}
                    className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.adFormats.includes(m.label) ? "bg-billboard-green" : "bg-billboard-paper"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channel-specific questions — every channel now has a typed
              schema (channelOnboardingSchemas.ts). See
              CHANNEL_UPDATES_AUDIT.md for the session history of which
              three came first. */}
          {channelSlug === "podcast" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Podcast specifics</p>
              <div>
                <label className={labelClass}>Average downloads per episode</label>
                <input type="number" min={0} value={form.podcastDownloads} onChange={(e) => update("podcastDownloads", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>How often do you publish?</label>
                <select value={form.podcastFrequency} onChange={(e) => update("podcastFrequency", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every two weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Average episode length (minutes)</label>
                <input type="number" min={0} value={form.podcastEpisodeLength} onChange={(e) => update("podcastEpisodeLength", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hosting platform</label>
                <input placeholder="e.g. Spotify, Apple Podcasts" value={form.podcastHostingPlatform} onChange={(e) => update("podcastHostingPlatform", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ad slots you offer</label>
                <div className="flex flex-wrap gap-2">
                  {(["pre-roll", "mid-roll", "post-roll"] as const).map((slot) => (
                    <button type="button" key={slot} onClick={() => update("podcastAdSlots", form.podcastAdSlots.includes(slot) ? form.podcastAdSlots.filter((s) => s !== slot) : [...form.podcastAdSlots, slot])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.podcastAdSlots.includes(slot) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Where are most of your listeners? <span className="font-normal text-billboard-inkSoft">(comma-separated)</span></label>
                <input placeholder="e.g. Gauteng, Western Cape" value={form.podcastRegions} onChange={(e) => update("podcastRegions", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {channelSlug === "informal-retail" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Shop specifics</p>
              <div>
                <label className={labelClass}>Estimated daily customers</label>
                <input type="number" min={0} value={form.retailFootTraffic} onChange={(e) => update("retailFootTraffic", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Trading hours</label>
                <input placeholder="e.g. 06:00–20:00, 7 days" value={form.retailTradingHours} onChange={(e) => update("retailTradingHours", e.target.value)} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.retailHasTill} onChange={(e) => update("retailHasTill", e.target.checked)} />
                We have an electronic till (needed for till-slip sponsorship)
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.retailHasWhatsapp} onChange={(e) => update("retailHasWhatsapp", e.target.checked)} />
                We have a WhatsApp broadcast list for regulars
              </label>
              {form.retailHasWhatsapp && (
                <div>
                  <label className={labelClass}>Roughly how many people on it?</label>
                  <input type="number" min={0} value={form.retailWhatsappSize} onChange={(e) => update("retailWhatsappSize", e.target.value)} className={inputClass} />
                </div>
              )}
              <div>
                <label className={labelClass}>Nearby landmark <span className="font-normal text-billboard-inkSoft">(helps us find you)</span></label>
                <input placeholder="e.g. opposite Shoprite on Voortrekker Rd" value={form.retailLandmark} onChange={(e) => update("retailLandmark", e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Lowest price (R)</label>
                  <input type="number" min={0} value={form.retailPriceMin} onChange={(e) => update("retailPriceMin", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Highest price (R)</label>
                  <input type="number" min={0} value={form.retailPriceMax} onChange={(e) => update("retailPriceMax", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {channelSlug === "sports" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Team/league specifics</p>
              <div>
                <label className={labelClass}>Sport</label>
                <input value={form.sportsSport} onChange={(e) => update("sportsSport", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Competition level</label>
                <select value={form.sportsLevel} onChange={(e) => update("sportsLevel", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="school">School</option>
                  <option value="amateur">Amateur</option>
                  <option value="semi-professional">Semi-professional</option>
                  <option value="professional">Professional</option>
                  <option value="university">University</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>League / competition name</label>
                <input value={form.sportsLeague} onChange={(e) => update("sportsLeague", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Current season</label>
                <input placeholder="e.g. 2026 or 2026/27" value={form.sportsSeason} onChange={(e) => update("sportsSeason", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Squad size</label>
                <input type="number" min={0} value={form.sportsSquadSize} onChange={(e) => update("sportsSquadSize", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Average matchday attendance <span className="font-normal text-billboard-inkSoft">(optional)</span></label>
                <input type="number" min={0} value={form.sportsAttendance} onChange={(e) => update("sportsAttendance", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Home venue</label>
                <input value={form.sportsVenue} onChange={(e) => update("sportsVenue", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Your role, for sponsorship authority</label>
                <select value={form.sportsAuthorityRole} onChange={(e) => update("sportsAuthorityRole", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="owner">Owner</option>
                  <option value="administrator">Administrator</option>
                  <option value="sponsorship_manager">Sponsorship manager</option>
                </select>
              </div>
            </div>
          )}

          {channelSlug === "social-media" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Page/profile specifics</p>
              <div>
                <label className={labelClass}>Primary platform</label>
                <select value={form.smPrimaryPlatform} onChange={(e) => update("smPrimaryPlatform", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="whatsapp_channel">WhatsApp Channel</option>
                  <option value="youtube">YouTube</option>
                  <option value="x">X</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Follower counts <span className="font-normal text-billboard-inkSoft">(e.g. instagram:3400, facebook:1200)</span></label>
                <input placeholder="platform:count, platform:count" value={form.smFollowerCounts} onChange={(e) => update("smFollowerCounts", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Best-performing content format</label>
                <select value={form.smBestFormat} onChange={(e) => update("smBestFormat", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="static_post">Static post</option>
                  <option value="story">Story</option>
                  <option value="reel_or_short">Reel/Short</option>
                  <option value="carousel">Carousel</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Posts per week</label>
                <input type="number" min={0} value={form.smPostsPerWeek} onChange={(e) => update("smPostsPerWeek", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Where is most of your audience?</label>
                <input placeholder="e.g. South Africa" value={form.smAudienceCountry} onChange={(e) => update("smAudienceCountry", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {channelSlug === "website" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Website specifics</p>
              <div>
                <label className={labelClass}>Domain</label>
                <input placeholder="e.g. example.co.za" value={form.webDomain} onChange={(e) => update("webDomain", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Monthly unique visitors</label>
                <input type="number" min={0} value={form.webMonthlyVisitors} onChange={(e) => update("webMonthlyVisitors", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Niche</label>
                <input placeholder="e.g. parenting, personal finance" value={form.webNiche} onChange={(e) => update("webNiche", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>CMS</label>
                <input placeholder="e.g. WordPress, Ghost" value={form.webCms} onChange={(e) => update("webCms", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Placements you offer</label>
                <div className="flex flex-wrap gap-2">
                  {(["banner", "in_article", "sponsored_post", "newsletter_mention", "popup"] as const).map((p) => (
                    <button type="button" key={p} onClick={() => update("webPlacements", form.webPlacements.includes(p) ? form.webPlacements.filter((x) => x !== p) : [...form.webPlacements, p])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.webPlacements.includes(p) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {p.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Average session duration (seconds) <span className="font-normal text-billboard-inkSoft">(optional)</span></label>
                <input type="number" min={0} value={form.webAvgSessionSeconds} onChange={(e) => update("webAvgSessionSeconds", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {channelSlug === "influencer" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Creator specifics</p>
              <div>
                <label className={labelClass}>Primary platform</label>
                <select value={form.infPrimaryPlatform} onChange={(e) => update("infPrimaryPlatform", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="whatsapp_channel">WhatsApp Channel</option>
                  <option value="youtube">YouTube</option>
                  <option value="x">X</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Niche</label>
                <select value={form.infNiche} onChange={(e) => update("infNiche", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="fashion_beauty">Fashion & Beauty</option>
                  <option value="food">Food</option>
                  <option value="fitness_health">Fitness & Health</option>
                  <option value="tech">Tech</option>
                  <option value="finance">Finance</option>
                  <option value="parenting">Parenting</option>
                  <option value="travel">Travel</option>
                  <option value="comedy_entertainment">Comedy & Entertainment</option>
                  <option value="gaming">Gaming</option>
                  <option value="general_lifestyle">General lifestyle</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Content formats you offer</label>
                <div className="flex flex-wrap gap-2">
                  {(["video", "reel", "post", "story_set", "livestream", "blog_post"] as const).map((f) => (
                    <button type="button" key={f} onClick={() => update("infContentFormats", form.infContentFormats.includes(f) ? form.infContentFormats.filter((x) => x !== f) : [...form.infContentFormats, f])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.infContentFormats.includes(f) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {f.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Average engagement rate (%)</label>
                <input type="number" min={0} step="0.1" value={form.infEngagementRate} onChange={(e) => update("infEngagementRate", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Past brand collaborations <span className="font-normal text-billboard-inkSoft">(count)</span></label>
                <input type="number" min={0} value={form.infPastCollabs} onChange={(e) => update("infPastCollabs", e.target.value)} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.infOffersUsageRights} onChange={(e) => update("infOffersUsageRights", e.target.checked)} />
                I can license my content for the brand's own use beyond the original post
              </label>
            </div>
          )}

          {channelSlug === "radio" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Station specifics</p>
              <div>
                <label className={labelClass}>Station name</label>
                <input value={form.radioStationName} onChange={(e) => update("radioStationName", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Frequency or stream</label>
                <input placeholder="e.g. 94.5 FM, or a stream URL" value={form.radioFrequency} onChange={(e) => update("radioFrequency", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Coverage area</label>
                <input placeholder="e.g. Cape Town metro" value={form.radioCoverageArea} onChange={(e) => update("radioCoverageArea", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Broadcast languages <span className="font-normal text-billboard-inkSoft">(comma-separated)</span></label>
                <input placeholder="e.g. isiXhosa, English" value={form.radioLanguages} onChange={(e) => update("radioLanguages", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Average daily listenership <span className="font-normal text-billboard-inkSoft">(optional)</span></label>
                <input type="number" min={0} value={form.radioListenership} onChange={(e) => update("radioListenership", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ad slot lengths you offer</label>
                <div className="flex flex-wrap gap-2">
                  {(["15", "30", "60"] as const).map((s) => (
                    <button type="button" key={s} onClick={() => update("radioSlotLengths", form.radioSlotLengths.includes(s) ? form.radioSlotLengths.filter((x) => x !== s) : [...form.radioSlotLengths, s])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.radioSlotLengths.includes(s) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.radioShowSponsorship} onChange={(e) => update("radioShowSponsorship", e.target.checked)} />
                We offer named show/timeslot sponsorship, not just rotation spots
              </label>
            </div>
          )}

          {channelSlug === "events" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Event specifics</p>
              <div>
                <label className={labelClass}>Event name</label>
                <input value={form.eventsName} onChange={(e) => update("eventsName", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Event type</label>
                <select value={form.eventsType} onChange={(e) => update("eventsType", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="conference">Conference</option>
                  <option value="tournament">Tournament</option>
                  <option value="festival">Festival</option>
                  <option value="concert">Concert</option>
                  <option value="trade_show">Trade show</option>
                  <option value="community_gathering">Community gathering</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Frequency</label>
                <select value={form.eventsFrequency} onChange={(e) => update("eventsFrequency", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="one_off">One-off</option>
                  <option value="annual">Annual</option>
                  <option value="recurring_other">Recurring (other)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Typical attendance</label>
                <input type="number" min={0} value={form.eventsAttendance} onChange={(e) => update("eventsAttendance", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Next event date <span className="font-normal text-billboard-inkSoft">(optional)</span></label>
                <input type="date" value={form.eventsNextDate} onChange={(e) => update("eventsNextDate", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sponsorship tiers you offer <span className="font-normal text-billboard-inkSoft">(comma-separated)</span></label>
                <input placeholder="e.g. Bronze, Silver, Gold, Headline" value={form.eventsTiers} onChange={(e) => update("eventsTiers", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Venue city</label>
                <input value={form.eventsVenueCity} onChange={(e) => update("eventsVenueCity", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {channelSlug === "community" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Group specifics</p>
              <div>
                <label className={labelClass}>Group type</label>
                <select value={form.commGroupType} onChange={(e) => update("commGroupType", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="neighbourhood_association">Neighbourhood association</option>
                  <option value="hobby_or_interest_group">Hobby/interest group</option>
                  <option value="professional_network">Professional network</option>
                  <option value="club">Club</option>
                  <option value="religious_or_faith_group">Religious/faith group</option>
                  <option value="school_or_alumni_group">School/alumni group</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Member count</label>
                <input type="number" min={0} value={form.commMemberCount} onChange={(e) => update("commMemberCount", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>How do you reach members?</label>
                <div className="flex flex-wrap gap-2">
                  {(["newsletter", "whatsapp_group", "facebook_group", "in_person_meetings", "sms_list"] as const).map((c) => (
                    <button type="button" key={c} onClick={() => update("commReachChannels", form.commReachChannels.includes(c) ? form.commReachChannels.filter((x) => x !== c) : [...form.commReachChannels, c])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.commReachChannels.includes(c) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {c.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Newsletter/update frequency</label>
                <select value={form.commNewsletterFrequency} onChange={(e) => update("commNewsletterFrequency", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every two weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="irregular">Irregular</option>
                  <option value="none">We don't send regular updates</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Geographic area</label>
                <input placeholder="e.g. Sandton, Stellenbosch" value={form.commGeographicArea} onChange={(e) => update("commGeographicArea", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {channelSlug === "transport" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Fleet specifics</p>
              <div>
                <label className={labelClass}>Operator type</label>
                <select value={form.transOperatorType} onChange={(e) => update("transOperatorType", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="individual_owner">Individual owner</option>
                  <option value="taxi_association">Taxi association</option>
                  <option value="fleet_operator">Fleet operator</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Number of vehicles</label>
                <input type="number" min={0} value={form.transVehicleCount} onChange={(e) => update("transVehicleCount", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Routes covered <span className="font-normal text-billboard-inkSoft">(comma-separated)</span></label>
                <input placeholder="e.g. Khayelitsha to Cape Town CBD" value={form.transRoutes} onChange={(e) => update("transRoutes", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estimated daily passengers <span className="font-normal text-billboard-inkSoft">(optional)</span></label>
                <input type="number" min={0} value={form.transDailyPassengers} onChange={(e) => update("transDailyPassengers", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Placement types available</label>
                <div className="flex flex-wrap gap-2">
                  {(["interior_sticker", "exterior_branding", "rank_screen", "headrest_placement", "qr_code_deal"] as const).map((p) => (
                    <button type="button" key={p} onClick={() => update("transPlacements", form.transPlacements.includes(p) ? form.transPlacements.filter((x) => x !== p) : [...form.transPlacements, p])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.transPlacements.includes(p) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {p.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Primary taxi rank <span className="font-normal text-billboard-inkSoft">(if any)</span></label>
                <input value={form.transPrimaryRank} onChange={(e) => update("transPrimaryRank", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {channelSlug === "associations" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Association specifics</p>
              <div>
                <label className={labelClass}>Association type</label>
                <select value={form.assocType} onChange={(e) => update("assocType", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="chamber_of_commerce">Chamber of commerce</option>
                  <option value="industry_body">Industry body</option>
                  <option value="networking_group">Networking group</option>
                  <option value="trade_union">Trade union</option>
                  <option value="professional_body">Professional body</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Member count</label>
                <input type="number" min={0} value={form.assocMemberCount} onChange={(e) => update("assocMemberCount", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sectors represented <span className="font-normal text-billboard-inkSoft">(comma-separated)</span></label>
                <input placeholder="e.g. construction, hospitality" value={form.assocSectors} onChange={(e) => update("assocSectors", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>How do you reach members?</label>
                <div className="flex flex-wrap gap-2">
                  {(["newsletter", "whatsapp_group", "facebook_group", "in_person_meetings", "sms_list"] as const).map((c) => (
                    <button type="button" key={c} onClick={() => update("assocReachChannels", form.assocReachChannels.includes(c) ? form.assocReachChannels.filter((x) => x !== c) : [...form.assocReachChannels, c])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.assocReachChannels.includes(c) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {c.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.assocHasDirectory} onChange={(e) => update("assocHasDirectory", e.target.checked)} />
                We have a member directory (needed for directory-listing sponsorship)
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.assocHostsEvents} onChange={(e) => update("assocHostsEvents", e.target.checked)} />
                We host regular conferences/webinars
              </label>
            </div>
          )}

          {channelSlug === "restaurants" && (
            <div className="border-t-2 border-billboard-paperDim pt-4 space-y-4">
              <p className="text-xs font-mono uppercase text-billboard-inkSoft">Venue specifics</p>
              <div>
                <label className={labelClass}>Venue type</label>
                <select value={form.restVenueType} onChange={(e) => update("restVenueType", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option value="sit_down_restaurant">Sit-down restaurant</option>
                  <option value="cafe">Café</option>
                  <option value="quick_service">Quick service</option>
                  <option value="bar_or_pub">Bar/pub</option>
                  <option value="food_truck_or_stall">Food truck/stall</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Seating capacity <span className="font-normal text-billboard-inkSoft">(leave blank if no fixed seating)</span></label>
                <input type="number" min={0} value={form.restSeatingCapacity} onChange={(e) => update("restSeatingCapacity", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estimated daily covers <span className="font-normal text-billboard-inkSoft">(customers served)</span></label>
                <input type="number" min={0} value={form.restDailyCovers} onChange={(e) => update("restDailyCovers", e.target.value)} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.restHasDigitalMenu} onChange={(e) => update("restHasDigitalMenu", e.target.checked)} />
                We have a digital menu/screen (needed for digital-menu sponsorship)
              </label>
              <div>
                <label className={labelClass}>Placement types available</label>
                <div className="flex flex-wrap gap-2">
                  {(["menu_sponsorship", "table_card", "receipt_or_qr", "loyalty_card", "digital_menu_screen", "waiting_area_screen"] as const).map((p) => (
                    <button type="button" key={p} onClick={() => update("restPlacements", form.restPlacements.includes(p) ? form.restPlacements.filter((x) => x !== p) : [...form.restPlacements, p])}
                      className={`text-sm font-semibold px-3 py-1.5 rounded border-2 border-billboard-ink transition ${form.restPlacements.includes(p) ? "bg-billboard-green" : "bg-billboard-paper"}`}>
                      {p.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Cuisine type</label>
                <input placeholder="e.g. Italian, Traditional South African" value={form.restCuisineType} onChange={(e) => update("restCuisineType", e.target.value)} className={inputClass} />
              </div>
            </div>
          )}
          <div>
            <label className={labelClass}>Category</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className={inputClass}>
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Avg. engagement %</label>
              <input type="number" step="0.1" value={form.engagement} onChange={(e) => update("engagement", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Avg. monthly reach</label>
              <input type="number" value={form.monthlyReach} onChange={(e) => update("monthlyReach", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Who's your audience?</label>
            <input value={form.audience} onChange={(e) => update("audience", e.target.value)} placeholder="e.g. Young families in the Southern Suburbs" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Describe your {isRequestFlow ? ch.name.toLowerCase() : "page"}</label>
            <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={3} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{isRequestFlow ? `${ch.name} age (months)` : "Account age (months)"}</label>
              <input type="number" value={form.accountAgeMonths} onChange={(e) => update("accountAgeMonths", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Posting frequency</label>
              <input value={form.postingFrequency} onChange={(e) => update("postingFrequency", e.target.value)} placeholder="e.g. Daily" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Your standard price per post (ZAR)</label>
            <input
              type="number" min={MIN_PRICE_PER_POST} value={form.pricePerPost}
              onChange={(e) => update("pricePerPost", e.target.value)}
              placeholder={`Minimum ${formatCurrency(MIN_PRICE_PER_POST)}`}
              className={inputClass}
            />
            {Number(form.pricePerPost) > 0 && Number(form.pricePerPost) < MIN_PRICE_PER_POST && (
              <p className="text-billboard-red text-xs font-semibold mt-1.5">Price must be at least R{MIN_PRICE_PER_POST}.</p>
            )}
            {(() => {
              const val = calculateSuggestedPrice({
                followers: Number(form.followers) || 0,
                engagement: Number(form.engagement) || 0,
                monthlyReach: Number(form.monthlyReach) || null,
              });
              return (
                <p className="text-xs text-billboard-inkSoft mt-1.5">
                  Suggested price based on your follower count and engagement: <strong className="text-billboard-greenDeep">R{val.suggested}</strong>{" "}
                  <span className="text-billboard-inkSoft">(typically R{val.low}–R{val.high}) — a starting guide, not a rule. You always set the final price.</span>
                </p>
              );
            })()}
            {Number(form.pricePerPost) >= MIN_PRICE_PER_POST && (
              <div className="mt-3 border-2 border-billboard-ink rounded p-3 bg-billboard-paperDim">
                <p className="font-mono text-[10px] uppercase tracking-wide text-billboard-inkSoft mb-2">How your earnings work</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-[11px] text-billboard-inkSoft">You set</div>
                    <div className="font-bold">R{Number(form.pricePerPost).toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-billboard-inkSoft">Marketplace fee ({Math.round(PLATFORM_COMMISSION_RATE * 100)}%)</div>
                    <div className="font-bold">-R{(Number(form.pricePerPost) * PLATFORM_COMMISSION_RATE).toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-billboard-inkSoft">Estimated earnings</div>
                    <div className="font-bold text-billboard-greenDeep">R{(Number(form.pricePerPost) * PUBLISHER_SHARE).toFixed(0)}</div>
                  </div>
                </div>
                <Link to="/fees" className="text-xs font-semibold underline text-billboard-ink mt-2 inline-block">Read full fees →</Link>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("details")} className={backClass}>Back</button>
            <button
              onClick={() => setStep("business")}
              disabled={Number(form.pricePerPost) < MIN_PRICE_PER_POST}
              className={`${continueClass} disabled:opacity-60`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "business" && (
        <div className="border-[3px] border-billboard-ink rounded p-6 space-y-4">
          <h1 className="text-2xl mb-1">Registered as a business?</h1>
          <p className="text-sm text-billboard-inkSoft">Optional — skip this if you post as an individual.</p>
          <div>
            <label className={labelClass}>Business name</label>
            <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Company registration number</label>
            <input value={form.companyRegistration} onChange={(e) => update("companyRegistration", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>VAT number</label>
            <input value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} className={inputClass} />
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("social")} className={backClass}>Back</button>
            <button onClick={() => setStep("review")} className={continueClass}>Continue</button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="border-[3px] border-billboard-ink rounded p-6 space-y-4">
          <h1 className="text-2xl mb-1">Last thing.</h1>
          <p className="text-sm text-billboard-inkSoft">
            Every application is reviewed by hand — you won't appear in the directory until you're approved.
          </p>

          {isRequestFlow && (
            <div className="border-2 border-billboard-ink rounded p-4 bg-billboard-paperDim">
              <h2 className="font-bold text-sm mb-2">Payment terms for {ch.name} creators</h2>
              <ul className="space-y-1.5 text-sm text-billboard-inkSoft">
                <li>• You'll have {CREATOR_APPROVAL_WINDOW_DAYS} days to approve or decline each request from your dashboard — unanswered requests simply expire, so you're never locked in.</li>
                <li>• Once you approve a request, the business has {BUSINESS_PAYMENT_WINDOW_DAYS} days to pay the platform directly — there's no online checkout for {ch.name.toLowerCase()}, and nothing goes live until that payment is confirmed.</li>
                <li>• You'll be paid within {CREATOR_PAYOUT_WINDOW_HOURS} hours of confirming your sponsored content is live.</li>
              </ul>
              <label className="flex items-start gap-2 text-sm mt-3 pt-3 border-t border-billboard-ink/15">
                <input type="checkbox" checked={form.acceptedPaymentTerms} onChange={(e) => update("acceptedPaymentTerms", e.target.checked)} className="mt-0.5" />
                I understand and accept these payment terms.
              </label>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update("acceptedTerms", e.target.checked)} className="mt-0.5" />
            I confirm the details above are accurate and accept the {isRequestFlow ? "creator" : "publisher"} terms.
          </label>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep("business")} className={backClass}>Back</button>
            <button onClick={submitApplication} disabled={!form.acceptedTerms || (isRequestFlow && !form.acceptedPaymentTerms) || submitting}
              className="bg-billboard-green border-[3px] border-billboard-ink font-bold px-5 py-3 rounded hover:-translate-y-0.5 transition disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
