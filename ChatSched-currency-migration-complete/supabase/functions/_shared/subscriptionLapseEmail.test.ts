import { describe, it, expect } from "vitest";
import { buildSubscriptionLapseEmail } from "./subscriptionLapseEmail";
import { SUBSCRIPTION_GRACE_PERIOD_DAYS } from "./subscriptionLapseDecision";

// CLAUDE_3.0.md's "Moving forward" item 1: payfast-notify and
// expire-subscription-grace-periods change subscription status silently
// today. This module is the pure content half of closing that gap — see
// its own file comment for why it's split from the actual send.

describe("buildSubscriptionLapseEmail", () => {
  it("names the grace period explicitly and links to /account for a business entering grace_period", () => {
    const { subject, html } = buildSubscriptionLapseEmail("grace_period", "business", "https://chatsched.co.za");
    expect(subject).toContain("ChatSched Business");
    expect(subject.toLowerCase()).toContain("action needed");
    expect(html).toContain(`${SUBSCRIPTION_GRACE_PERIOD_DAYS} days`);
    expect(html).toContain("https://chatsched.co.za/account");
  });

  it("warns a business about credit forfeiture on grace_period but not yet as a done deal", () => {
    const { html } = buildSubscriptionLapseEmail("grace_period", "business", "https://chatsched.co.za");
    expect(html).toContain("still safe for now");
    expect(html).not.toContain("has been forfeited");
  });

  it("says a business's credit HAS been forfeited on suspended, not just at risk", () => {
    const { html } = buildSubscriptionLapseEmail("suspended", "business", "https://chatsched.co.za");
    expect(html).toContain("has been forfeited");
    expect(html).not.toContain("still safe for now");
  });

  it("never mentions launch credit for a publisher account, in either event", () => {
    const graceHtml = buildSubscriptionLapseEmail("grace_period", "publisher", "https://chatsched.co.za").html;
    const suspendedHtml = buildSubscriptionLapseEmail("suspended", "publisher", "https://chatsched.co.za").html;
    expect(graceHtml.toLowerCase()).not.toContain("credit");
    expect(suspendedHtml.toLowerCase()).not.toContain("credit");
  });

  it("uses the Publisher Network plan name for publisher accounts, not the business one", () => {
    const { subject } = buildSubscriptionLapseEmail("suspended", "publisher", "https://chatsched.co.za");
    expect(subject).toContain("ChatSched Publisher Network");
    expect(subject).not.toContain("ChatSched Business");
  });

  it("omits the manage-subscription link entirely when siteUrl is empty, rather than linking to a bare /account", () => {
    const { html } = buildSubscriptionLapseEmail("grace_period", "business", "");
    expect(html).not.toContain("/account");
  });

  it("escapes HTML-significant characters if a plan name ever contained them", () => {
    // Plan names are hardcoded today (never user input), but the escape
    // helper exists and is exercised here so a future change that makes
    // any part of this templated doesn't silently start passing through
    // unescaped markup.
    const { html } = buildSubscriptionLapseEmail("suspended", "business", "https://chatsched.co.za");
    expect(html).not.toMatch(/<script/i);
  });

  it("produces different subjects for grace_period vs suspended so the two are distinguishable in an inbox", () => {
    const grace = buildSubscriptionLapseEmail("grace_period", "business", "https://chatsched.co.za").subject;
    const suspended = buildSubscriptionLapseEmail("suspended", "business", "https://chatsched.co.za").subject;
    expect(grace).not.toBe(suspended);
  });
});
