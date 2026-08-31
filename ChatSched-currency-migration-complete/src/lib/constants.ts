import type { Category, Platform, WorkWithUsCategory, PartnerCategory, PartnerType, AdvertiseProduct, CommunityEventType, CommunityQuestionCategory } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "food", name: "Food & Drink", icon: "food" },
  { slug: "fitness", name: "Fitness & Wellness", icon: "fitness" },
  { slug: "beauty", name: "Beauty & Grooming", icon: "beauty" },
  { slug: "home", name: "Home & Trade Services", icon: "home" },
  { slug: "family", name: "Family & Community", icon: "family" },
  { slug: "auto", name: "Automotive", icon: "auto" },
  { slug: "fashion", name: "Fashion & Lifestyle", icon: "fashion" },
  { slug: "tech", name: "Tech & Gaming", icon: "tech" },
  { slug: "local-lifestyle", name: "Local Lifestyle", icon: "lifestyle" },
  { slug: "regional-news", name: "Regional News", icon: "news" },
  { slug: "community-groups", name: "Community Groups", icon: "community" },
  { slug: "retail", name: "Retail & Shopping", icon: "retail" },
  { slug: "property", name: "Property & Real Estate", icon: "property" },
  { slug: "pets", name: "Pets & Animals", icon: "pets" },
  { slug: "events", name: "Events & Entertainment", icon: "events" },
  { slug: "social-followers", name: "Social Followers", icon: "social" },
];

export const PROVINCES = [
  "Western Cape", "Gauteng", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape",
];

export const PLATFORMS: Platform[] = ["Facebook Page", "Facebook Group", "Instagram", "TikTok", "WhatsApp Channel", "X", "LinkedIn", "YouTube"];

// Social media placement formats a creator can offer — shown on the Social
// Media Creator Application form and editable from the Creator Dashboard
// (PlacementTypesPanel in PublisherDashboardView.tsx). A creator can offer
// more than one.
export const PLACEMENT_TYPES = [
  "Story Post",
  "Main Feed / Page Post",
  "Short-form Video (Reels / TikTok / Shorts)",
  "Dedicated Video",
  "Carousel Post",
  "Bio Link / Link-in-Bio Placement",
] as const;

export type PlacementType = (typeof PLACEMENT_TYPES)[number];

// Recommended formats per platform, based on that platform's standard post
// types — used to pre-highlight sensible defaults for a creator's selected
// platform(s) rather than showing all six options with equal weight.
export const RECOMMENDED_PLACEMENT_TYPES_BY_PLATFORM: Record<Platform, PlacementType[]> = {
  "Facebook Page": ["Main Feed / Page Post", "Story Post", "Short-form Video (Reels / TikTok / Shorts)"],
  "Facebook Group": ["Main Feed / Page Post"],
  "Instagram": ["Story Post", "Main Feed / Page Post", "Short-form Video (Reels / TikTok / Shorts)", "Carousel Post", "Bio Link / Link-in-Bio Placement"],
  "TikTok": ["Short-form Video (Reels / TikTok / Shorts)", "Bio Link / Link-in-Bio Placement"],
  "WhatsApp Channel": ["Main Feed / Page Post"],
  "X": ["Main Feed / Page Post", "Short-form Video (Reels / TikTok / Shorts)"],
  "LinkedIn": ["Main Feed / Page Post", "Carousel Post", "Dedicated Video"],
  "YouTube": ["Dedicated Video", "Short-form Video (Reels / TikTok / Shorts)"],
};

export function recommendedPlacementTypes(platforms: Platform[]): PlacementType[] {
  const set = new Set<PlacementType>();
  for (const p of platforms) {
    for (const t of RECOMMENDED_PLACEMENT_TYPES_BY_PLATFORM[p] ?? []) set.add(t);
  }
  return [...set];
}

export const LANGUAGES = [
  "English", "Afrikaans", "Zulu", "Xhosa", "Sotho", "Tswana",
  "Venda", "Tsonga", "Ndebele", "Swati", "Portuguese", "French",
];

// National coverage — no longer Cape Town only, now that the platform is
// live across South Africa. Real suburb names verified per city (Wikipedia,
// property listing sites) rather than generated, since inventing suburb
// names for a real product would actively mislead publishers filling in
// their profile. A free-text `suburb` field still stores fine for anyone
// outside these lists — this dataset powers the /suburbs browse page, the
// Browse filter, and the suburb-field autocomplete on apply/profile forms.
export interface CitySuburbs { city: string; province: string; suburbs: string[] }

export const SA_CITIES_SUBURBS: CitySuburbs[] = [
  {
    city: "Cape Town", province: "Western Cape",
    suburbs: [
      "City Bowl", "Sea Point", "Green Point", "Camps Bay", "Woodstock",
      "Observatory", "Claremont", "Rondebosch", "Newlands", "Constantia",
      "Century City", "Table View", "Milnerton", "Bellville", "Durbanville",
      "Parow", "Goodwood", "Muizenberg", "Somerset West", "Mitchells Plain",
    ],
  },
  {
    city: "Johannesburg", province: "Gauteng",
    suburbs: [
      "Sandton", "Rosebank", "Randburg", "Fourways", "Midrand",
      "Melville", "Parktown", "Bryanston", "Soweto", "Bedfordview",
      "Northcliff", "Greenside", "Linden", "Houghton", "Parkview",
      "Emmarentia", "Bassonia", "Glenvista", "Lenasia", "Braamfontein",
    ],
  },
  {
    city: "Pretoria", province: "Gauteng",
    suburbs: [
      "Centurion", "Hatfield", "Brooklyn", "Menlyn", "Waterkloof",
      "Lynnwood", "Arcadia", "Sunnyside", "Montana", "Silverton",
      "Garsfontein", "Faerie Glen", "Moreleta Park", "Equestria", "Mamelodi",
      "Soshanguve", "Akasia", "Groenkloof", "Mooikloof", "Menlo Park",
    ],
  },
  {
    city: "Durban", province: "KwaZulu-Natal",
    suburbs: [
      "Umhlanga", "Durban North", "Berea", "Glenwood", "Westville",
      "Pinetown", "Hillcrest", "Kloof", "Amanzimtoti", "La Lucia",
      "Morningside", "Musgrave", "Chatsworth", "Phoenix", "Umlazi",
      "Bluff", "Queensburgh", "Umbilo", "Overport", "Mount Edgecombe",
    ],
  },
  {
    city: "Pietermaritzburg", province: "KwaZulu-Natal",
    suburbs: [
      "Ashburton", "Athlone", "Bellevue", "Bisley", "Blackridge",
      "Boughton", "Clarendon", "Edendale", "Epworth", "Hayfields",
      "Imbali", "Lynnfield Park", "Pelham", "Prestbury", "Scottsville",
      "Sweetwaters", "Wembley", "Westgate", "Winterskloof", "Northdale",
    ],
  },
  {
    city: "Gqeberha", province: "Eastern Cape",
    suburbs: [
      "Summerstrand", "Mill Park", "Walmer", "Humewood", "Lorraine",
      "Fairview", "Bluewater Bay", "Lovemore Heights", "Sunridge Park", "Fernglen",
      "Mount Croix", "Newton Park", "Greenacres", "Algoa Park", "Motherwell",
      "Central", "Kabega Park", "Charlo", "Sydenham", "Framesby",
    ],
  },
  {
    city: "East London", province: "Eastern Cape",
    suburbs: [
      "Gonubie", "Vincent", "Beacon Bay", "Berea", "Nahoon",
      "Quigney", "Selborne", "Southernwood", "Stirling", "Amalinda",
      "Cambridge", "Bonnie Doone", "Bunker's Hill", "Baysville", "West Bank",
      "Sunnyridge", "Bonza Bay", "Winterstrand", "Braelyn", "Dorchester",
    ],
  },
  {
    city: "Bloemfontein", province: "Free State",
    suburbs: [
      "Heidedal", "Bainsvlei", "Brandwag", "Fauna", "Fichardt Park",
      "Fleurdal", "Pellissier", "Uitsig", "Universitas", "Westdene",
      "Wilgehof", "Willows", "Langenhoven Park", "Arboretum", "Bayswater",
      "Dan Pienaar", "Heuwelsig", "Naval Hill", "Waverley", "Hospitaalpark",
    ],
  },
  {
    city: "Polokwane", province: "Limpopo",
    suburbs: [
      "Westenburg", "Nirvana", "Bendor", "Welgelegen", "Moregloed",
      "Annadale", "Ivydale", "Flora Park", "Fauna Park", "Penina Park",
      "Ivy Park", "Ster Park", "Dalmada", "Broadlands", "Woodlands",
      "Thornhill", "Seshego", "Mahlasedi Park", "Ladine", "Capricorn Park",
    ],
  },
  {
    city: "Mbombela", province: "Mpumalanga",
    suburbs: [
      "West Acres", "Sonheuwel", "Steiltes", "Riverside Park", "Bateleur Estate",
      "Drum Rock", "Karino", "The Rest", "Stonehenge", "Valencia Park",
      "Nelspruit Central", "Nelsville", "Kamagugu", "Kanyamazane", "Matumi Valley",
      "Nelpark", "White River", "Kabokweni", "Matsulu", "Mataffin",
    ],
  },
  {
    city: "Kimberley", province: "Northern Cape",
    suburbs: [
      "New Park", "Hadison Park", "Belgravia", "Rhodesdene", "Herlear",
      "Hillcrest", "Royldene", "Monument Heights", "Carters Glen", "El Toro Park",
      "Roodepan", "Riviera", "Beaconsfield", "Albertynshof", "Cassandra",
      "Kimberley North", "Southridge", "Vergenoeg", "Galeshewe", "Kestellhof",
    ],
  },
  {
    city: "Rustenburg", province: "North West",
    suburbs: [
      "Cashan", "Geelhoutpark", "Kroondal", "Olifantsnek", "Oos-Einde",
      "Protea Park", "Rustenburg Central", "Rustenburg North", "Safari Gardens", "Tlhabane",
      "Waterkloof", "Waterval East", "Wigwam", "Safarituine", "Bo-dorp",
      "Boitekong", "Freedom Park", "Karlienpark", "Meriting", "Zinniaville",
    ],
  },
];

// Flat list across every city above — used for the suburb-field
// autocomplete on apply/profile forms, where a publisher just needs
// sensible suggestions as they type, not a city-scoped list (their `city`
// field is separate free text). Kept as its own export so those call sites
// don't need to know about the grouped structure.
export const SA_SUBURBS_AUTOCOMPLETE = SA_CITIES_SUBURBS.flatMap((c) => c.suburbs);

// City-centre coordinates for the Map view (MapView.tsx) — pins publishers
// by city rather than exact address, since no publisher record has a
// street-level lat/lng (and geocoding every profile would need an external
// geocoding API this project doesn't otherwise depend on). Good enough for
// "where in the country are publishers" at a glance; Browse's text filters
// remain the way to narrow down to an exact suburb.
export const SA_CITY_COORDS: Record<string, [number, number]> = {
  "Cape Town": [-33.9249, 18.4241],
  "Johannesburg": [-26.2041, 28.0473],
  "Pretoria": [-25.7479, 28.2293],
  "Durban": [-29.8587, 31.0218],
  "Pietermaritzburg": [-29.6006, 30.3794],
  "Gqeberha": [-33.9608, 25.6022],
  "East London": [-33.0153, 27.9116],
  "Bloemfontein": [-29.0852, 26.1596],
  "Polokwane": [-23.9045, 29.4689],
  "Mbombela": [-25.4753, 30.9694],
  "Kimberley": [-28.7282, 24.7499],
  "Rustenburg": [-25.6672, 27.2424],
};

// Back-compat alias — a few older call sites (Browse's suburb filter select)
// still group by city directly via SA_CITIES_SUBURBS instead.
export const CAPE_TOWN_SUBURBS = SA_CITIES_SUBURBS[0].suburbs;

// The platform's cut of every payment — the single source of truth. Adjust
// this one line if the commission changes; PUBLISHER_SHARE below is derived
// from it, so nothing else needs to change. Applies across both the
// original PayFast flow (Admin, EarningsDashboard) and the 4 request-flow
// channels added in Phase 17 (ChannelRequestForm, PublisherDashboardView,
// AdminChannelRequests).
export const PLATFORM_COMMISSION_RATE = 0.12;
export const PUBLISHER_SHARE = 1 - PLATFORM_COMMISSION_RATE;

// Single source of truth for the WhatsApp contact number and site email.
// Previously hardcoded separately in Header, Contact, ComingSoon, and
// ChannelPage (four copies, easy to update three and miss one) — change it
// here and every "WhatsApp us" link updates together. Publisher listings
// do not use this: public profiles open ChatSched Messages instead.
export const WHATSAPP_NUMBER = "27608973472"; // 060 897 3472
export const WHATSAPP_NUMBER_DISPLAY = "060 897 3472";
export const CONTACT_EMAIL = "info@chatsched.com";
export const CONTACT_WEBSITE = "chatsched.com";
export const CONTACT_ADDRESS_LINES = ["West Way Farmstay Accommodation", "R27, Langebaan, 7357", "South Africa"];

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// A booking is "unpaid too long" once a payment has been marked paid but
// the payout hasn't gone out after this many days — used to flag stale
// payouts in the admin UI rather than relying on someone remembering to
// check. Pricing's FAQ promises payouts "on a regular schedule"; this is
// what makes that promise something the UI actually surfaces, not just
// copy.
export const PAYOUT_DUE_DAYS = 7;

// How many days a "Featured" placement lasts once an admin grants it.
export const FEATURED_DURATION_DAYS = 14;

// ── Channel request escrow timing (influencer / website / podcast / radio) ──
// Mirrors the generated-column deadlines in schema_phase17 exactly — kept as
// named constants here so the UI copy (disclaimers, countdowns) never drifts
// from what the database actually enforces. See that migration's header
// comment for the full state-machine rationale.
export const CREATOR_APPROVAL_WINDOW_DAYS = 7;   // creator must approve/decline within this many days of a request
export const BUSINESS_PAYMENT_WINDOW_DAYS = 7;   // business must pay within this many days of creator approval
export const CREATOR_PAYOUT_WINDOW_HOURS = 48;   // creator is paid within this many hours of the post going live

// Bank transfer details shown to a business paying by EFT — used by both
// the channel_requests flow (influencer/website/podcast/radio, always
// manual EFT — see schema_phase17_channel_marketplace.sql) and, since
// schema_phase28_eft_payment.sql, as an on-site alternative to PayFast on
// the original requests flow too. PayFast itself is untouched; EFT is a
// second option shown alongside it, not a replacement.
export const PLATFORM_BANK_DETAILS = {
  accountHolder: "Chatsched",
  bank: "Capitec Bank",
  accountNumber: "1149592735",
  branchCode: "470010",
  accountType: "Business / Cheque",
};

// AI Content Studio — business-side content generator (see
// content-studio-generate & content-studio-subscribe edge functions, and
// marketingSuite/ContentStudio.tsx). Kept here so the UI, the subscribe
// checkout, and the edge functions' own duplicated copies (Deno can't import
// from src/lib) all agree on the same numbers — see the "keep in sync"
// comments at each edge function's copy if this ever changes.
// Publisher portfolio (schema_phase27_portfolio.sql) — kept small
// deliberately, since this project runs on free-tier hosting. The byte cap
// here is a client-side pre-check for a fast, friendly error message; the
// real enforcement is the storage bucket's own file_size_limit, which a
// client-side check alone could never guarantee against someone hitting the
// Storage API directly.
export const MAX_PORTFOLIO_IMAGES = 5;
export const MAX_PORTFOLIO_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB — matches the bucket's file_size_limit
export const ALLOWED_PORTFOLIO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Careers page CV upload (schema_phase45_careers.sql) — private career-cvs
// bucket, same "client check is a UX nicety, the bucket's own limits are
// the real enforcement" posture as the portfolio/proof buckets above.
export const CAREER_CV_MAX_BYTES = 5 * 1024 * 1024; // 5MB — matches the bucket's file_size_limit
export const ALLOWED_CV_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const CAREER_CV_BUCKET = "career-cvs";

// /work-with-us — a wider, lower-commitment intake than /careers (see
// schema_phase46_work_with_us.sql's header comment for the distinction).
// Order here is the display order on the page.
export const WORK_WITH_US_CATEGORIES: { value: WorkWithUsCategory; label: string }[] = [
  { value: "developers", label: "Developers" },
  { value: "designers", label: "Designers" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "creators", label: "Creators" },
  { value: "community_managers", label: "Community Managers" },
  { value: "sales_representatives", label: "Sales Representatives" },
  { value: "freelancers", label: "Freelancers" },
  { value: "internships", label: "Internships" },
];
export const WORK_WITH_US_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024; // 5MB — matches the bucket's file_size_limit
export const ALLOWED_WORK_WITH_US_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/png", "image/webp",
];
export const WORK_WITH_US_ATTACHMENT_BUCKET = "work-with-us-attachments";

// /partners — the ecosystem/referral & integration partner program. Order
// here is the display order on the page. Each blurb is one line shown on
// that category's card.
export const PARTNER_CATEGORIES: { value: PartnerCategory; label: string; blurb: string }[] = [
  { value: "marketing_agencies", label: "Marketing Agencies", blurb: "Bring your clients local reach they can't get from a feed algorithm." },
  { value: "web_developers", label: "Web Developers", blurb: "Refer clients who need advertising, or build on top of the platform." },
  { value: "pr_agencies", label: "PR Agencies", blurb: "Add real local placements to the campaigns you're already running." },
  { value: "photographers", label: "Photographers", blurb: "Turn campaign creative work into an ongoing referral relationship." },
  { value: "event_companies", label: "Event Companies", blurb: "Connect event sponsors and exhibitors with local audiences." },
  { value: "payment_providers", label: "Payment Providers", blurb: "Explore integration and processing partnerships." },
  { value: "software_companies", label: "Software Companies", blurb: "Explore integrations that put ChatSched in front of your users." },
  { value: "creator_networks", label: "Creator Networks", blurb: "Bring your network of creators onto the platform as publishers." },
  { value: "media_organisations", label: "Media Organisations", blurb: "List your channels and reach the local businesses looking for them." },
  { value: "business_associations", label: "Business Associations", blurb: "Give your members a trusted way to reach local customers." },
];

// /partners/apply — the functional role an applicant would play in the
// partner program itself, independent of their industry category above.
export const PARTNER_TYPES: { value: PartnerType; label: string; blurb: string }[] = [
  { value: "agency", label: "Agency Partner", blurb: "Manage campaigns for clients." },
  { value: "technology", label: "Technology Partner", blurb: "Integrate with ChatSched." },
  { value: "media", label: "Media Partner", blurb: "Bring publisher networks." },
  { value: "community", label: "Community Partner", blurb: "Bring business communities." },
  { value: "referral", label: "Referral Partner", blurb: "Refer businesses/publishers." },
];

// /advertise — "Advertise With ChatSched". ChatSched's own traffic and
// audience, sold as inventory (distinct from the marketplace's publisher
// listings — see schema_phase50_advertise.sql's header comment).
export const ADVERTISE_PRODUCTS: { value: AdvertiseProduct; label: string; blurb: string }[] = [
  { value: "website_advertising", label: "Website Advertising", blurb: "Banner and display placements across chatsched.com." },
  { value: "newsletter_sponsorship", label: "Newsletter Sponsorship", blurb: "A dedicated mention or slot in ChatSched's own newsletter." },
  { value: "featured_placement", label: "Featured Marketplace Placement", blurb: "Priority visibility in the publisher directory and homepage." },
  { value: "sponsored_article", label: "Sponsored Article", blurb: "A branded piece alongside the Blog and Success Centre guides." },
  { value: "brand_partnership", label: "Brand Partnership", blurb: "A broader, ongoing partnership with the ChatSched brand itself." },
];

// Campaign proof screenshots (schema_phase40_proof_screenshots.sql) — one
// per proof submission, private bucket (unlike portfolio-images, this isn't
// meant to be publicly browsable). Same "client check is a UX nicety, the
// bucket's own file_size_limit is the real enforcement" split as portfolio
// images above.
export const MAX_PROOF_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5MB — matches the bucket's file_size_limit
export const ALLOWED_PROOF_SCREENSHOT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const CONTENT_STUDIO_MONTHLY_PRICE = 99;
export const CONTENT_STUDIO_DAILY_LIMIT = 15;

// ChatSched Publisher Network / ChatSched Business — the agency pivot's
// membership subscriptions. Kept as separate constants from
// CONTENT_STUDIO_MONTHLY_PRICE even though the publisher price is the same
// number today — they're unrelated products and either could change price
// independently later.
export const PUBLISHER_SUBSCRIPTION_PRICE = 99;
export const BUSINESS_SUBSCRIPTION_PRICE = 199;
// One-time, granted on a business's first completed subscription payment —
// see business_subscriptions.launch_credit_granted in schema_phase55.
export const BUSINESS_LAUNCH_CREDIT_AMOUNT = 199;
export const CONTENT_STUDIO_MONTHLY_LIMIT = 150;

export interface ContentStudioFormat {
  id: string;
  label: string;
  hint: string;
}

export const CONTENT_STUDIO_FORMATS: ContentStudioFormat[] = [
  { id: "facebook", label: "Facebook Post", hint: "Feed post with a natural CTA" },
  { id: "instagram", label: "Instagram Caption", hint: "Caption + relevant hashtags" },
  { id: "linkedin", label: "LinkedIn Post", hint: "Slightly more professional tone" },
  { id: "tiktok", label: "TikTok Caption", hint: "Short, punchy, hashtags" },
  { id: "whatsapp", label: "WhatsApp Status", hint: "Under 140 characters" },
  { id: "x", label: "X Post", hint: "Under 280 characters" },
  { id: "google_business", label: "Google Business Profile Update", hint: "Clear offer + CTA" },
  { id: "blog", label: "Blog Article", hint: "Short article, ~250–400 words" },
  { id: "email", label: "Email Newsletter", hint: "Subject line + body" },
];
export const SWATCHES = [
  { label: "Yellow", value: "from-billboard-yellow to-billboard-yellowDeep" },
  { label: "Green", value: "from-billboard-green to-billboard-greenDeep" },
  { label: "Red → Yellow deep", value: "from-billboard-red to-billboard-yellowDeep" },
  { label: "Ink", value: "from-billboard-ink to-billboard-inkSoft" },
  { label: "Yellow → Red", value: "from-billboard-yellow to-billboard-red" },
  { label: "Green → Ink", value: "from-billboard-green to-billboard-ink" },
  { label: "Red → Yellow", value: "from-billboard-red to-billboard-yellow" },
  { label: "Ink → Green", value: "from-billboard-ink to-billboard-green" },
];

// /community — event types and Q&A categories (schema_phase51_community.sql).
export const COMMUNITY_EVENT_TYPES: { value: CommunityEventType; label: string }[] = [
  { value: "webinar", label: "Webinar" },
  { value: "online", label: "Online event" },
  { value: "in_person", label: "In person" },
];
export const COMMUNITY_QUESTION_CATEGORIES: { value: CommunityQuestionCategory; label: string }[] = [
  { value: "publisher", label: "Publisher Community" },
  { value: "business", label: "Business Community" },
  { value: "marketing", label: "Marketing Discussions" },
];

// Phase 53 — content approval (business brief / creator draft images & video,
// see ContentApprovalPanel.tsx and schema_phase53_content_approval.sql).
// Same "client check is a fast, friendly nicety — the bucket's own
// file_size_limit/allowed_mime_types is the real enforcement" split as the
// other upload constants here.
export const MAX_CONTENT_ASSET_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB — matches the bucket's file_size_limit
export const MAX_CONTENT_ASSET_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB — matches the bucket's file_size_limit
export const ALLOWED_CONTENT_ASSET_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_CONTENT_ASSET_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"];

// Phase 54 — structured deliverables (see DeliverablesPanel.tsx). Quick-add
// suggestions only — a business can type any freeform label, same as
// advertising_method elsewhere in this schema has no closed list either.
export const DELIVERABLE_QUICK_ADD = [
  "Instagram Reel",
  "Instagram Story",
  "Instagram Post",
  "TikTok Video",
  "YouTube Video",
  "Website Placement",
  "Podcast Mention",
  "Radio Spot",
  "Tracking Link",
  "Promo Code",
] as const;
