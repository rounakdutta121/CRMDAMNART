import { describe, expect, it } from "vitest";
import { sanitizeInternalRedirectPath } from "@/lib/safe-redirect";

describe("sanitizeInternalRedirectPath", () => {
  it("allows internal CRM paths", () => {
    expect(sanitizeInternalRedirectPath("/leads/my-leads")).toBe(
      "/leads/my-leads"
    );
    expect(sanitizeInternalRedirectPath("/websites/abc/performance")).toBe(
      "/websites/abc/performance"
    );
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(sanitizeInternalRedirectPath("https://evil.example")).toBe(
      "/dashboard"
    );
    expect(sanitizeInternalRedirectPath("//evil.example")).toBe("/dashboard");
  });

  it("rejects paths outside allowed prefixes", () => {
    expect(sanitizeInternalRedirectPath("/admin/secret")).toBe("/dashboard");
  });

  it("uses fallback for empty values", () => {
    expect(sanitizeInternalRedirectPath(undefined, "/leads")).toBe("/leads");
  });
});
