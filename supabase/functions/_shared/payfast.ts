// Shared PayFast helpers used by both payfast-checkout and payfast-notify.
//
// The field order below is NOT alphabetical — PayFast's own docs explicitly
// warn against alphabetical order (that's a different, API-only format).
// The signature is built from fields in the order PayFast documents them.
// Source: https://developers.payfast.co.za/docs (Custom Integration → signature).
import { createHash } from "node:crypto";

export const PAYFAST_FIELD_ORDER = [
  "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
  "name_first", "name_last", "email_address", "cell_number",
  "m_payment_id", "amount", "item_name", "item_description",
  "custom_int1", "custom_int2", "custom_int3", "custom_int4", "custom_int5",
  "custom_str1", "custom_str2", "custom_str3", "custom_str4", "custom_str5",
  "email_confirmation", "confirmation_address",
  "payment_method",
  // Recurring billing fields — only present on subscription checkouts (see
  // content-studio-subscribe). PayFast documents these as the last block in
  // signature order, after payment_method.
  "subscription_type", "billing_date", "recurring_amount", "frequency", "cycles",
] as const;

// PayFast wants application/x-www-form-urlencoded-style escaping: spaces as
// '+' and uppercase hex. encodeURIComponent already gives uppercase hex, so
// the only gap is the space -> '+' swap.
function pfEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function paramStringFromEntries(entries: [string, string][], passphrase?: string): string {
  const parts = entries
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${pfEncode(String(v))}`);
  let out = parts.join("&");
  // Only appended when a passphrase is actually set on the account — an
  // empty/placeholder passphrase must be omitted entirely, not sent as "".
  if (passphrase) out += `&passphrase=${pfEncode(passphrase)}`;
  return out;
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/** Signs an outgoing checkout request using PayFast's fixed field order. */
export function signCheckoutFields(data: Record<string, string | undefined>, passphrase?: string): string {
  const entries: [string, string][] = [];
  for (const key of PAYFAST_FIELD_ORDER) {
    const value = data[key];
    if (value !== undefined && value !== "") entries.push([key, value]);
  }
  return md5(paramStringFromEntries(entries, passphrase));
}

/**
 * Recomputes the signature for an inbound ITN using the order the fields
 * actually arrived in (PayFast documents ITN verification this way, distinct
 * from the fixed checkout field order above — do not reuse PAYFAST_FIELD_ORDER
 * here).
 */
export function signItnFields(orderedEntries: [string, string][], passphrase?: string): string {
  const withoutSignature = orderedEntries.filter(([k]) => k !== "signature");
  return md5(paramStringFromEntries(withoutSignature, passphrase));
}

export function payfastHost(mode: "sandbox" | "live"): string {
  return mode === "sandbox" ? "sandbox.payfast.co.za" : "www.payfast.co.za";
}

// --- PayFast recurring-billing API (distinct from the checkout/ITN flow
// above) — used to actually stop a subscription token from being charged
// again, as opposed to signCheckoutFields/signItnFields which only cover
// starting a checkout and verifying PayFast's payment notifications.
//
// This is a *different* signing scheme from the rest of this file: the API
// signs its own request headers (merchant-id, version, timestamp) plus any
// body params, sorted alphabetically by key — not the fixed PAYFAST_FIELD_ORDER
// used for checkout. Source: PayFast's published Postman collection
// (https://developers.payfast.co.za/api) — "Recurring Billing" section,
// e.g. the cancel/pause/unpause subscription requests, which all use this
// alphabetical header+body signature rather than the checkout one.
//
// One host either way (api.payfast.co.za) — sandbox vs live is a
// `?testing=true` query param, not a different subdomain like the checkout
// host (sandbox.payfast.co.za vs www.payfast.co.za).
const PAYFAST_API_HOST = "api.payfast.co.za";

function payfastApiTimestamp(): string {
  // PayFast wants YYYY-MM-DDTHH:MM:SS (no milliseconds, no trailing Z) —
  // toISOString() gives both, so trim after the seconds.
  return new Date().toISOString().slice(0, 19);
}

function signApiRequest(
  headers: Record<string, string>,
  body: Record<string, string>,
  passphrase?: string
): string {
  const merged: Record<string, string> = { ...headers, ...body };
  const entries = Object.keys(merged)
    .sort()
    .map((key): [string, string] => [key, merged[key]]);
  return md5(paramStringFromEntries(entries, passphrase));
}

export interface PayfastApiResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Cancels a PayFast recurring-billing subscription by its token — the
 * piece cancel-subscription was missing entirely. Idempotent on PayFast's
 * side (cancelling an already-cancelled token just returns an error body,
 * which callers should treat as "nothing left to do" rather than a hard
 * failure) but that judgment call is left to the caller, since this
 * function only reports what PayFast said.
 */
export async function cancelPayfastSubscription(
  token: string,
  merchantId: string,
  passphrase: string | undefined,
  mode: "sandbox" | "live"
): Promise<PayfastApiResult> {
  const headers: Record<string, string> = {
    "merchant-id": merchantId,
    version: "v1",
    timestamp: payfastApiTimestamp(),
  };
  const signature = signApiRequest(headers, {}, passphrase);

  const query = mode === "sandbox" ? "?testing=true" : "";
  const res = await fetch(`https://${PAYFAST_API_HOST}/subscriptions/${encodeURIComponent(token)}/cancel${query}`, {
    method: "PUT",
    headers: { ...headers, signature },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}
