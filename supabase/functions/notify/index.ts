// Sends a notification email for a well-defined set of events. Deliberately
// does NOT accept an arbitrary to/subject/body from the client — every email
// this function can send is constructed server-side from data the caller is
// already authorized to see, via requests' own RLS policies. That's what
// stops a logged-in business from turning this into a way to spam anyone.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Kind = "new_request" | "new_message" | "status_change";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { kind, request_id } = (await req.json()) as { kind: Kind; request_id: string };
    if (!kind || !request_id) return json({ error: "kind and request_id are required" }, 400);

    // Scoped to the caller's own JWT — the select below only succeeds if
    // RLS already says this caller may see this request (their own, or an
    // admin). That's the entire authorization check for this function.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not logged in" }, 401);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = profile?.role === "admin";

    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("*, publisher:publishers(name)")
      .eq("id", request_id)
      .single();
    if (requestError || !request) return json({ error: "Request not found or not yours" }, 404);

    const siteUrl = Deno.env.get("SITE_URL")!;
    const adminEmail = Deno.env.get("ADMIN_EMAIL")!;
    const publisherName = request.publisher?.name ?? "a publisher";

    let to: string | null = null;
    let subject = "";
    let html = "";

    if (kind === "new_request") {
      to = adminEmail;
      subject = `New request: ${publisherName}`;
      html = `<p>A business just requested a campaign with <strong>${escapeHtml(publisherName)}</strong>.</p><p><a href="${siteUrl}/admin">Open the admin panel</a></p>`;
    } else if (kind === "status_change") {
      if (!isAdmin) {
        return json({ error: "Only admins can trigger status change notifications" }, 403);
      }
      to = await lookupEmail(request.business_id);
      subject = `Your ${publisherName} campaign is now "${request.status}"`;
      html = `<p>Your campaign request with <strong>${escapeHtml(publisherName)}</strong> is now marked <strong>${escapeHtml(request.status)}</strong>.</p><p><a href="${siteUrl}/dashboard">View your dashboard</a></p>`;
    } else if (kind === "new_message") {
      const senderIsAdmin = isAdmin;
      to = senderIsAdmin ? await lookupEmail(request.business_id) : adminEmail;
      subject = `New message about your ${publisherName} campaign`;
      html = `<p>You've got a new message about the <strong>${escapeHtml(publisherName)}</strong> campaign.</p><p><a href="${siteUrl}/${senderIsAdmin ? "dashboard" : "admin"}">Read it</a></p>`;
    } else {
      return json({ error: "Unknown kind" }, 400);
    }

    if (!to) return json({ error: "Could not resolve a recipient" }, 500);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      // Not configured yet — fail quietly rather than breaking the action
      // that triggered this (the request/message/status change itself
      // already succeeded before this function was ever called).
      console.warn("notify: RESEND_API_KEY not set, skipping email");
      return json({ skipped: true });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") || "ChatSched <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("notify: Resend error", await res.text());
      return json({ error: "Email failed to send" }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    console.error("notify: unexpected error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});

async function lookupEmail(userId: string): Promise<string | null> {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
