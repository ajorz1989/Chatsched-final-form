import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enHowItWorks from "./locales/en/howItWorks.json";
import enForBusinesses from "./locales/en/forBusinesses.json";
import enForPublishers from "./locales/en/forPublishers.json";

import afCommon from "./locales/af/common.json";
import afHome from "./locales/af/home.json";
import afHowItWorks from "./locales/af/howItWorks.json";
import afForBusinesses from "./locales/af/forBusinesses.json";
import afForPublishers from "./locales/af/forPublishers.json";

import xhCommon from "./locales/xh/common.json";
import xhHome from "./locales/xh/home.json";
import xhHowItWorks from "./locales/xh/howItWorks.json";
import xhForBusinesses from "./locales/xh/forBusinesses.json";
import xhForPublishers from "./locales/xh/forPublishers.json";

import zuCommon from "./locales/zu/common.json";
import zuHome from "./locales/zu/home.json";
import zuHowItWorks from "./locales/zu/howItWorks.json";
import zuForBusinesses from "./locales/zu/forBusinesses.json";
import zuForPublishers from "./locales/zu/forPublishers.json";

/**
 * Covers the public marketing surface only — Header, Footer, Home,
 * HowItWorks, ForBusinesses, ForPublishers — deliberately not the
 * authenticated app (dashboards, forms, admin). Those stay English-only
 * for now: translating live transactional UI carries real correctness
 * risk (a mistranslated payment/escrow term is a much bigger problem than
 * a mistranslated marketing headline), and it's the marketing pages that
 * actually drive whether a South African SME owner who reads Afrikaans,
 * isiXhosa, or isiZulu first even gets as far as signing up. See
 * SUPPORTED_LANGUAGES below and supabase/DEPLOY.md's "Localization"
 * section for how to extend this to more pages/languages later — it's
 * just more keys in more JSON files, no code changes needed.
 *
 * Missing keys silently fall back to English (fallbackLng below) rather
 * than showing a raw "home.hero.title"-style key — important since
 * isiXhosa/isiZulu coverage here is a first pass, not yet reviewed by a
 * native speaker (flagged clearly in DEPLOY.md).
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "af", label: "Afrikaans", nativeLabel: "Afrikaans" },
  { code: "xh", label: "isiXhosa", nativeLabel: "isiXhosa" },
  { code: "zu", label: "isiZulu", nativeLabel: "isiZulu" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, home: enHome, howItWorks: enHowItWorks, forBusinesses: enForBusinesses, forPublishers: enForPublishers },
      af: { common: afCommon, home: afHome, howItWorks: afHowItWorks, forBusinesses: afForBusinesses, forPublishers: afForPublishers },
      xh: { common: xhCommon, home: xhHome, howItWorks: xhHowItWorks, forBusinesses: xhForBusinesses, forPublishers: xhForPublishers },
      zu: { common: zuCommon, home: zuHome, howItWorks: zuHowItWorks, forBusinesses: zuForBusinesses, forPublishers: zuForPublishers },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: ["common", "home", "howItWorks", "forBusinesses", "forPublishers"],
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // localStorage first (an explicit past choice from the switcher),
      // then the browser's own language list — never guess from IP/geo.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "chatsched_language",
    },
    react: { useSuspense: false }, // avoid an extra Suspense boundary just for translation loading — everything is bundled, not fetched
  });

export default i18n;
