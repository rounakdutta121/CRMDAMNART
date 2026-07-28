import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  canAccessWebsite,
  canExportLeads,
  canReceiveLeadForWebsite,
  canViewLead,
  defaultCanReceiveLeadAssignments,
  defaultCanViewUnassignedLeads,
  resolveWebsiteFilter,
} from "@/lib/permissions";
import type { SessionUser, UserRole } from "@/types/auth";
import type { Lead } from "@/types/lead";

const websiteA = "507f1f77bcf86cd799439011";
const websiteB = "507f1f77bcf86cd799439012";
const userId = "507f1f77bcf86cd799439013";
const otherUserId = "507f1f77bcf86cd799439014";

function sessionUser(
  role: UserRole,
  permittedWebsiteIds: string[] = [websiteA]
): SessionUser {
  return {
    id: userId,
    name: "Test User",
    email: "test@example.com",
    role,
    permittedWebsiteIds,
    sessionVersion: 1,
    canReceiveLeadAssignments: defaultCanReceiveLeadAssignments(role),
    canViewUnassignedLeads: defaultCanViewUnassignedLeads(role),
  };
}

function lead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date();
  return {
    _id: new ObjectId(),
    leadNumber: "DA-LEAD-2026-000001",
    contactId: new ObjectId(),
    websiteId: new ObjectId(websiteA),
    sourceSystem: "manual",
    salesStatus: "new",
    fulfilmentStatus: "not_started",
    priority: "normal",
    currency: "USD",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("resolveWebsiteFilter", () => {
  it("returns all websites for super_admin when no filter is requested", () => {
    expect(resolveWebsiteFilter(sessionUser("super_admin"))).toBeNull();
  });

  it("restricts non-admin users to permitted websites", () => {
    expect(resolveWebsiteFilter(sessionUser("sales_executive", [websiteA]))).toEqual([
      websiteA,
    ]);
  });

  it("returns empty array when user requests an unauthorized website", () => {
    expect(
      resolveWebsiteFilter(sessionUser("sales_executive", [websiteA]), websiteB)
    ).toEqual([]);
  });
});

describe("canAccessWebsite", () => {
  it("allows super_admin to access any website", () => {
    expect(canAccessWebsite(sessionUser("super_admin"), websiteB)).toBe(true);
  });

  it("denies access to websites outside permitted list", () => {
    expect(canAccessWebsite(sessionUser("sales_executive", [websiteA]), websiteB)).toBe(
      false
    );
  });
});

describe("canViewLead", () => {
  it("allows managers to view all leads in an accessible website", () => {
    const user = sessionUser("sales_manager", [websiteA]);
    expect(canViewLead(user, lead({ websiteId: new ObjectId(websiteA) }))).toBe(true);
  });

  it("allows sales executives to view their assigned leads", () => {
    const user = sessionUser("sales_executive", [websiteA]);
    expect(
      canViewLead(
        user,
        lead({
          websiteId: new ObjectId(websiteA),
          assignedUserId: new ObjectId(userId),
        })
      )
    ).toBe(true);
  });

  it("denies sales executives access to leads assigned to others", () => {
    const user = sessionUser("sales_executive", [websiteA]);
    expect(
      canViewLead(
        user,
        lead({
          websiteId: new ObjectId(websiteA),
          assignedUserId: new ObjectId(otherUserId),
        })
      )
    ).toBe(false);
  });

  it("allows sales executives with unassigned visibility to view unassigned leads", () => {
    const user = {
      ...sessionUser("sales_executive", [websiteA]),
      canViewUnassignedLeads: true,
    };
    expect(
      canViewLead(
        user,
        lead({
          websiteId: new ObjectId(websiteA),
          assignedUserId: undefined,
        })
      )
    ).toBe(true);
  });

  it("denies sales executives without unassigned visibility", () => {
    const user = sessionUser("sales_executive", [websiteA]);
    expect(
      canViewLead(
        user,
        lead({
          websiteId: new ObjectId(websiteA),
          assignedUserId: undefined,
        })
      )
    ).toBe(false);
  });
});

describe("canReceiveLeadForWebsite", () => {
  it("treats missing assignment flag as role default", () => {
    const user = {
      isActive: true,
      role: "sales_executive" as const,
      permittedWebsiteIds: [new ObjectId(websiteA)],
      canReceiveLeadAssignments: undefined as unknown as boolean,
    };
    expect(canReceiveLeadForWebsite(user, websiteA)).toBe(true);
  });

  it("allows operations users when assignment eligibility is explicitly enabled", () => {
    const user = {
      isActive: true,
      role: "operations" as const,
      permittedWebsiteIds: [new ObjectId(websiteA)],
      canReceiveLeadAssignments: true,
    };
    expect(canReceiveLeadForWebsite(user, websiteA)).toBe(true);
  });

  it("denies operations users without assignment eligibility", () => {
    const user = {
      isActive: true,
      role: "operations" as const,
      permittedWebsiteIds: [new ObjectId(websiteA)],
      canReceiveLeadAssignments: false,
    };
    expect(canReceiveLeadForWebsite(user, websiteA)).toBe(false);
  });
});

describe("canExportLeads", () => {
  it("allows export for admin and marketing roles", () => {
    expect(canExportLeads("super_admin")).toBe(true);
    expect(canExportLeads("admin")).toBe(true);
    expect(canExportLeads("sales_manager")).toBe(true);
    expect(canExportLeads("marketing")).toBe(true);
  });

  it("denies export for sales executives and viewers", () => {
    expect(canExportLeads("sales_executive")).toBe(false);
    expect(canExportLeads("viewer")).toBe(false);
    expect(canExportLeads("operations")).toBe(false);
  });
});
