import { describe, expect, it } from "vitest";
import { validateStrongPassword } from "@/lib/password-policy";
import {
  calculatePercentChange,
  resolveReportingPeriod,
  safeRate,
} from "@/lib/reporting-periods";
import {
  buildDashboardAccessCookieValue,
  verifyDashboardAccessToken,
} from "@/lib/share-access-cookie";
import { hashToken } from "@/lib/crypto";

describe("password policy", () => {
  it("rejects weak passwords", () => {
    expect(validateStrongPassword("short")).not.toBeNull();
    expect(validateStrongPassword("alllowercase1!")).not.toBeNull();
  });

  it("accepts strong passwords", () => {
    expect(validateStrongPassword("DamnArt2026!")).toBeNull();
  });
});

describe("reporting periods", () => {
  it("resolves last month in timezone", () => {
    const period = resolveReportingPeriod({
      preset: "last_month",
      timezone: "Asia/Kolkata",
    });
    expect(period.label).toContain("Last month");
    expect(period.startDate).toBeDefined();
    expect(period.endDate).toBeDefined();
  });

  it("resolves last 7 days", () => {
    const period = resolveReportingPeriod({
      preset: "last_7_days",
      timezone: "UTC",
    });
    expect(period.granularity).toBe("day");
  });

  it("handles zero previous period safely", () => {
    const change = calculatePercentChange(10, 0);
    expect(change.value).toBeNull();
    expect(change.label).toContain("baseline");
  });

  it("calculates safe rates", () => {
    expect(safeRate(5, 0)).toBe(0);
    expect(safeRate(5, 10)).toBe(50);
  });
});

describe("dashboard share access cookie", () => {
  it("creates and verifies signed token", () => {
    const shareId = "507f1f77bcf86cd799439011";
    const cookie = buildDashboardAccessCookieValue(shareId);
    expect(verifyDashboardAccessToken(cookie.value, shareId)).toBe(true);
    expect(verifyDashboardAccessToken(cookie.value, "other")).toBe(false);
  });
});

describe("invitation token hashing", () => {
  it("hashes tokens consistently", () => {
    const hash1 = hashToken("test-token-value");
    const hash2 = hashToken("test-token-value");
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe("test-token-value");
  });
});
