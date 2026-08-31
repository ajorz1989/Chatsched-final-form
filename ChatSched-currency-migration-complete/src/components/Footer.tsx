import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CONTACT_EMAIL, CONTACT_WEBSITE, CONTACT_ADDRESS_LINES, WHATSAPP_NUMBER_DISPLAY, whatsappLink } from "../lib/constants";
import InstallAppButton from "./InstallAppButton";
import LanguageSwitcher from "./LanguageSwitcher";

const WHATSAPP_LINK = whatsappLink("Hi, I'd like to know more");

const LINK_CLASS = "block text-sm mb-2 hover:text-billboard-yellow transition-colors";
const HEADING_CLASS = "font-mono text-xs uppercase tracking-wider text-[#8A8272] mb-3";

export default function Footer() {
  const { t } = useTranslation("common");

  return (
    <footer className="bg-billboard-ink text-billboard-paperDim pt-14 pb-8">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 pb-12 border-b border-[#3A342B]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 pr-4">
            <div className="flex items-center gap-2 font-display text-lg text-billboard-paper mb-2">
              <svg width="24" height="20" viewBox="0 0 26 22" fill="none">
                <rect x="1" y="1" width="24" height="14" stroke="currentColor" strokeWidth="2" />
                <line x1="8" y1="15" x2="8" y2="21" stroke="currentColor" strokeWidth="2" />
                <line x1="18" y1="15" x2="18" y2="21" stroke="currentColor" strokeWidth="2" />
              </svg>
              CHATSCHED
            </div>
            <p className="text-sm max-w-[32ch] mb-4">{t("footer.tagline")}</p>
            <LanguageSwitcher compact />
          </div>

          <div>
            <h4 className={HEADING_CLASS}>{t("footer.siteHeading")}</h4>
            <Link to="/for-businesses" className={LINK_CLASS}>{t("footer.forBusinesses")}</Link>
            <Link to="/for-publishers" className={LINK_CLASS}>{t("footer.forPublishers")}</Link>
            <Link to="/browse" className={LINK_CLASS}>{t("footer.browsePublishers")}</Link>
            <Link to="/suburbs" className={LINK_CLASS}>{t("footer.suburbs")}</Link>
            <Link to="/categories" className={LINK_CLASS}>{t("footer.categories")}</Link>
            <Link to="/how-it-works" className={LINK_CLASS}>{t("footer.howItWorks")}</Link>
            <Link to="/how-payment-works" className={LINK_CLASS}>{t("footer.howPaymentWorks")}</Link>
            <Link to="/pricing" className={LINK_CLASS}>Pricing</Link>
            <Link to="/fees" className={LINK_CLASS}>Fees</Link>
            <Link to="/faq" className={LINK_CLASS}>{t("footer.faq")}</Link>
            <Link to="/help" className={LINK_CLASS}>Help Centre</Link>
            <Link to="/glossary" className={LINK_CLASS}>Glossary</Link>
            <Link to="/roadmap" className={LINK_CLASS}>Roadmap</Link>
            <Link to="/budget-calculator" className={LINK_CLASS}>Budget Calculator</Link>
            <Link to="/earnings-estimator" className={LINK_CLASS}>Earnings Estimator</Link>
            <Link to="/reach-checker" className={LINK_CLASS}>Local Reach Checker</Link>
            <Link to="/channel-quiz" className={LINK_CLASS}>Which Channel Fits You?</Link>
            <Link to="/community" className={LINK_CLASS}>Community</Link>
            <Link to="/case-studies" className={LINK_CLASS}>{t("footer.examples")}</Link>
            <Link to="/about" className={LINK_CLASS}>{t("footer.about")}</Link>
            <Link to="/blog" className={LINK_CLASS}>{t("footer.blog")}</Link>
            <Link to="/business-success" className={LINK_CLASS}>Business Success Centre</Link>
            <Link to="/publisher-success" className={LINK_CLASS}>Publisher Success Centre</Link>
            <Link to="/transparency" className={LINK_CLASS}>Transparency</Link>
            <Link to="/advertise" className={LINK_CLASS}>Advertise With Us</Link>
            <Link to="/press" className={LINK_CLASS}>Press</Link>
            <Link to="/security" className={LINK_CLASS}>Security</Link>
            <Link to="/contact" className={LINK_CLASS}>{t("footer.contact")}</Link>
            {/* Not yet in the i18n common namespace (see keyParity.test.ts) — plain text for now, same as this page's own hardcoded copy. */}
            <Link to="/careers" className={LINK_CLASS}>Careers</Link>
            <Link to="/work-with-us" className={LINK_CLASS}>Work With Us</Link>
            <Link to="/partners" className={LINK_CLASS}>Partners</Link>
            <Link to="/partners/apply" className={LINK_CLASS}>Become a Partner</Link>
            <Link to="/investors" className={LINK_CLASS}>Investors</Link>
            <Link to="/mission" className={LINK_CLASS}>Our Mission</Link>
          </div>

          <div>
            <h4 className={HEADING_CLASS}>{t("footer.channelsHeading")}</h4>
            <Link to="/channels/influencer" className={LINK_CLASS}>{t("footer.influencerCampaigns")}</Link>
            <Link to="/channels/website" className={LINK_CLASS}>{t("footer.websiteAdvertising")}</Link>
            <Link to="/channels/podcast" className={LINK_CLASS}>{t("footer.podcastSponsorships")}</Link>
            <Link to="/channels/radio" className={LINK_CLASS}>{t("footer.radioAdvertising")}</Link>
            {/* Same "not yet in the i18n common namespace" situation as Careers/Work With Us
                above — plain text for now rather than a rushed translation pass. */}
            <Link to="/channels/sports" className={LINK_CLASS}>Sports Sponsorship</Link>
            <Link to="/channels/events" className={LINK_CLASS}>Event Sponsorship</Link>
            <Link to="/channels/community" className={LINK_CLASS}>Community Advertising</Link>
            <Link to="/channels/transport" className={LINK_CLASS}>Transport Media</Link>
            <Link to="/channels/informal-retail" className={LINK_CLASS}>Spaza Shop Advertising</Link>
            <Link to="/channels/associations" className={LINK_CLASS}>Business Network Advertising</Link>
            <Link to="/channels/restaurants" className={LINK_CLASS}>Restaurant Advertising</Link>
          </div>

          <div>
            <h4 className={HEADING_CLASS}>{t("footer.accountHeading")}</h4>
            <Link to="/login" className={LINK_CLASS}>{t("footer.logIn")}</Link>
            <Link to="/register" className={LINK_CLASS}>{t("footer.register")}</Link>
            <Link to="/register?role=publisher" className={LINK_CLASS}>{t("footer.publisherRegistration")}</Link>
          </div>

          <div>
            <h4 className={HEADING_CLASS}>{t("footer.legalHeading")}</h4>
            <Link to="/trust" className={LINK_CLASS}>{t("footer.trustCentre")}</Link>
            <Link to="/trust/safety" className={LINK_CLASS}>{t("footer.safety")}</Link>
            <Link to="/compliance" className={LINK_CLASS}>{t("footer.complianceCentre")}</Link>
            <Link to="/platform-rules" className={LINK_CLASS}>{t("footer.platformRules")}</Link>
            <Link to="/privacy" className={LINK_CLASS}>{t("footer.privacyPolicy")}</Link>
            <Link to="/terms" className={LINK_CLASS}>{t("footer.terms")}</Link>
            <Link to="/accessibility" className={LINK_CLASS}>Accessibility</Link>
          </div>

          <div>
            <h4 className={HEADING_CLASS}>{t("footer.contactHeading")}</h4>
            <a href={`https://${CONTACT_WEBSITE}`} className={LINK_CLASS}>{CONTACT_WEBSITE}</a>
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>{CONTACT_EMAIL}</a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{WHATSAPP_NUMBER_DISPLAY}</a>
            <p className="text-sm leading-relaxed mb-2">{CONTACT_ADDRESS_LINES.join(", ")}</p>
            <InstallAppButton className="inline-flex items-center gap-1.5 text-xs font-semibold text-billboard-paperDim hover:text-billboard-yellow transition-colors" />
          </div>
        </div>

        <div className="pt-5 text-xs text-[#8A8272] flex flex-wrap justify-between gap-2">
          <span>{t("footer.copyright")}</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/privacy" className="hover:text-billboard-yellow">{t("footer.privacyPolicy")}</Link>
            <Link to="/terms" className="hover:text-billboard-yellow">{t("footer.terms")}</Link>
            <span>{t("footer.liveAcrossSA")}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
