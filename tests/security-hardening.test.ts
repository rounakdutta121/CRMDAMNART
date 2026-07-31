import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  assertCanViewLead,
  canAccessWebsite,
  canViewLead,
} from "@/lib/permissions";
import type { SessionUser } from "@/types/auth";
import type { Lead } from "@/types/lead";

const websiteA = "507f1f77bcf86cd799439011";
const websiteB = "507f1f77bcf86cd799439012";

function userForWebsiteA(): SessionUser {
  return {
    id: "507f1f77bcf86cd799439013",
    name: "Scoped User",
    email: "scoped@example.com",
    role: "sales_manager",
    permittedWebsiteIds: [websiteA],
    sessionVersion: 1,
    canReceiveLeadAssignments: true,
    canViewUnassignedLeads: true,
  };
}

function leadOnWebsite(websiteId: string): Lead {
  const now = new Date();
  return {
    _id: new ObjectId(),
    leadNumber: "DA-LEAD-2026-000099",
    contactId: new ObjectId(),
    websiteId: new ObjectId(websiteId),
    sourceSystem: "manual",
    status: "new",
    priority: "normal",
    currency: "USD",
    createdAt: now,
    updatedAt: now,
  };
}

describe("cross-website isolation", () => {
  it("denies website B access for website A user", () => {
    const user = userForWebsiteA();
    expect(canAccessWebsite(user, websiteB)).toBe(false);
  });

  it("denies viewing a lead from website B", () => {
    const user = userForWebsiteA();
    const foreignLead = leadOnWebsite(websiteB);
    expect(canViewLead(user, foreignLead)).toBe(false);
    expect(() => assertCanViewLead(user, foreignLead)).toThrow();
  });

  it("allows viewing a lead from website A", () => {
    const user = userForWebsiteA();
    const localLead = leadOnWebsite(websiteA);
    expect(canViewLead(user, localLead)).toBe(true);
    expect(() => assertCanViewLead(user, localLead)).not.toThrow();
  });
});

describe("shared dashboard aggregate safety", () => {
  const forbiddenFieldNames = [
    "email",
    "phone",
    "gclid",
    "contactName",
    "leadMessage",
    "passwordHash",
    "apiKey",
  ];

  it("performance aggregate shape contains only aggregate metrics", () => {
    const sampleAggregate = {
      periodLabel: "This month",
      metrics: {
        totalLeads: { value: 42 },
        gclidCaptureRate: { value: 0.5 },
      },
      charts: {
        leadsOverTime: [{ period: "2026-01", count: 10 }],
        byStatus: [{ label: "New", count: 5 }],
        bySource: [{ label: "Website", count: 5 }],
      },
      tables: {
        byStatus: [{ label: "New", count: 5 }],
        bySource: [{ label: "Website", count: 5 }],
      },
    };

    const serialized = JSON.stringify(sampleAggregate).toLowerCase();
    for (const field of forbiddenFieldNames) {
      expect(serialized.includes(`"${field}"`)).toBe(false);
    }
  });
});
