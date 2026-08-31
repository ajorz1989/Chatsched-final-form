import { reportError } from "./errorTracking";

export interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
  statusCode?: string | number;
  name?: string;
  error_description?: string;
}

/**
 * Known PostgreSQL and PostgREST error codes mapped to clear, user-accessible descriptions.
 */
const KNOWN_POSTGRES_CODES: Record<string, string> = {
  "23505": "A record with this identifier already exists.",
  "42501": "Permission denied — you do not have permission to perform this action.",
  "23503": "The referenced item does not exist or was deleted.",
  "23502": "A required field was missing.",
  "22P02": "Invalid data format or value type.",
  "PGRST116": "Requested item was not found.",
  "PGRST301": "JWT expired or authentication token invalid.",
  "42P01": "Database relation does not exist.",
};

/**
 * Checks if an error is a unique constraint violation (PG code 23505).
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as SupabaseLikeError;
  return e.code === "23505";
}

/**
 * Checks if an error is an RLS or permission error (PG code 42501 or 403 status).
 */
export function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as SupabaseLikeError;
  return e.code === "42501" || e.status === 403 || e.statusCode === 403;
}

/**
 * Extracts error code from any error structure if available.
 */
export function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as SupabaseLikeError;
  if (e.code && typeof e.code === "string") return e.code;
  if (e.statusCode) return String(e.statusCode);
  if (e.status) return String(e.status);
  return null;
}

/**
 * Formats a Supabase, Postgres, Storage, or network error into a user-friendly
 * message while preserving and surfacing the actual error code and details for debugging.
 *
 * @param error The raw error caught or returned from Supabase
 * @param contextMessage Optional contextual action description (e.g. "Couldn't save request")
 * @returns A formatted string containing the explanation and code reference.
 */
export function formatSupabaseError(error: unknown, contextMessage?: string): string {
  if (!error) {
    return contextMessage || "An unknown error occurred.";
  }

  // Report to error tracking/Sentry in the background
  reportError(error, { context: contextMessage });

  if (typeof error === "string") {
    return contextMessage ? `${contextMessage}: ${error}` : error;
  }

  if (typeof error === "object") {
    const e = error as SupabaseLikeError;
    const code = extractErrorCode(e);
    const rawMessage = e.message || e.error_description || (e as Error).toString();
    const knownDesc = code ? KNOWN_POSTGRES_CODES[code] : null;

    let detail = rawMessage;
    if (knownDesc && !rawMessage.toLowerCase().includes(knownDesc.toLowerCase())) {
      detail = `${knownDesc} (${rawMessage})`;
    } else if (code && !rawMessage.includes(code)) {
      detail = `${rawMessage} [${code}]`;
    }

    if (e.details && typeof e.details === "string" && e.details.trim().length > 0) {
      detail += ` — ${e.details.trim()}`;
    }

    if (contextMessage) {
      return `${contextMessage}: ${detail}`;
    }
    return detail;
  }

  return contextMessage ? `${contextMessage}: ${String(error)}` : String(error);
}
