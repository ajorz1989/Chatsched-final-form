// Thin wrapper around the Resend API call every email-sending function in
// this repo already made inline (notify/index.ts,
// expire-channel-requests/index.ts). Pulled out here for the two new call
// sites this phase adds (payfast-notify's grace-period entry,
// expire-subscription-grace-periods' suspension) rather than rewriting
// those two already-working call sites to also use it — same
// "don't touch what isn't broken" posture the rest of this codebase's
// handoff notes describe. Same fail-quietly-if-unconfigured behavior as
// every other email sender here: a missing RESEND_API_KEY should never
// break the status change that triggered the email.
export async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("sendResendEmail: RESEND_API_KEY not set, skipping email to", params.to);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM") || "ChatSched <onboarding@resend.dev>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    console.error("sendResendEmail: Resend error", await res.text());
    return false;
  }
  return true;
}
