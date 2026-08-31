// Looks up the account holder's email and sends one subscription-lapse
// email. Used from two places — payfast-notify (grace_period entry) and
// expire-subscription-grace-periods (suspended) — kept here as one
// function instead of copy-pasted into both, so the
// "getUserById -> build content -> send" sequence can't quietly diverge
// between the two call sites the way escapeHtml/json already have
// (harmlessly) elsewhere in this codebase. Always called best-effort
// (`.catch(...)`) by its callers — this itself doesn't swallow errors
// from sendResendEmail, since sendResendEmail already returns false
// rather than throwing on a send failure.
import { buildSubscriptionLapseEmail, type SubscriptionAccountType, type SubscriptionLapseEvent } from "./subscriptionLapseEmail.ts";
import { sendResendEmail } from "./resend.ts";

// deno-lint-ignore no-explicit-any
export async function notifySubscriptionLapse(
  admin: any,
  userId: string,
  accountType: SubscriptionAccountType,
  event: SubscriptionLapseEvent
): Promise<void> {
  const { data: userData, error } = await admin.auth.admin.getUserById(userId);
  if (error || !userData.user?.email) return;

  const siteUrl = Deno.env.get("SITE_URL") || "";
  const { subject, html } = buildSubscriptionLapseEmail(event, accountType, siteUrl);
  await sendResendEmail({ to: userData.user.email, subject, html });
}
