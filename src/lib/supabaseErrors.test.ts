import { describe, it, expect } from "vitest";
import {
  formatSupabaseError,
  isUniqueViolation,
  isPermissionDenied,
  extractErrorCode,
} from "./supabaseErrors";

describe("supabaseErrors utility", () => {
  it("formats string errors with optional context", () => {
    expect(formatSupabaseError("Network timeout")).toBe("Network timeout");
    expect(formatSupabaseError("Network timeout", "Couldn't save")).toBe("Couldn't save: Network timeout");
  });

  it("surfaces standard Postgres error codes with friendly descriptions", () => {
    const error23505 = { code: "23505", message: "duplicate key value violates unique constraint" };
    const formatted = formatSupabaseError(error23505, "Couldn't submit application");
    expect(formatted).toContain("Couldn't submit application");
    expect(formatted).toContain("A record with this identifier already exists");
    expect(formatted).toContain("duplicate key value violates unique constraint");
  });

  it("correctly identifies unique violations", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "42501" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });

  it("correctly identifies permission denied errors", () => {
    expect(isPermissionDenied({ code: "42501" })).toBe(true);
    expect(isPermissionDenied({ status: 403 })).toBe(true);
    expect(isPermissionDenied({ statusCode: 403 })).toBe(true);
    expect(isPermissionDenied({ code: "23505" })).toBe(false);
  });

  it("extracts error codes reliably", () => {
    expect(extractErrorCode({ code: "PGRST116" })).toBe("PGRST116");
    expect(extractErrorCode({ status: 404 })).toBe("404");
    expect(extractErrorCode({ statusCode: 500 })).toBe("500");
    expect(extractErrorCode({})).toBe(null);
    expect(extractErrorCode("string")).toBe(null);
  });

  it("includes details when present", () => {
    const errorWithDetails = {
      code: "23503",
      message: "foreign key violation",
      details: "Key (user_id)=(123) is not present in table profiles.",
    };
    const formatted = formatSupabaseError(errorWithDetails, "Failed to link user");
    expect(formatted).toContain("Key (user_id)=(123)");
    expect(formatted).toContain("Failed to link user");
  });

  it("handles null or undefined errors gracefully", () => {
    expect(formatSupabaseError(null)).toBe("An unknown error occurred.");
    expect(formatSupabaseError(undefined, "Save failed")).toBe("Save failed");
  });
});
