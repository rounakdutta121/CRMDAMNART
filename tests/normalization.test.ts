import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizeOptionalString,
  normalizePhone,
  normalizeWebsiteCode,
} from "@/lib/normalization";

describe("normalizeEmail", () => {
  it("trims and lowercases email addresses", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("normalizePhone", () => {
  it("strips non-digits while preserving leading plus", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });

  it("returns digits only when no plus prefix", () => {
    expect(normalizePhone("(555) 987-6543")).toBe("5559876543");
  });
});

describe("normalizeOptionalString", () => {
  it("trims name-like strings", () => {
    expect(normalizeOptionalString("  Jane Doe  ")).toBe("Jane Doe");
  });

  it("returns undefined for empty or whitespace-only values", () => {
    expect(normalizeOptionalString("")).toBeUndefined();
    expect(normalizeOptionalString("   ")).toBeUndefined();
    expect(normalizeOptionalString(null)).toBeUndefined();
    expect(normalizeOptionalString(undefined)).toBeUndefined();
  });
});

describe("normalizeWebsiteCode", () => {
  it("normalizes codes for consistency", () => {
    expect(normalizeWebsiteCode("  My Site!!  ")).toBe("my-site");
  });
});
