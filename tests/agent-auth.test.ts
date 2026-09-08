import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { ApiError } from "@/lib/api-auth";
import {
  agentHasScope,
  requireAgentScope,
  roleFromAgentScopes,
  toSessionUserFromAgent,
} from "@/lib/agent-auth";
import type { SafeAiAgent } from "@/types/ai-agent";

function makeAgent(
  overrides: Partial<SafeAiAgent> = {}
): SafeAiAgent {
  return {
    _id: new ObjectId(),
    name: "Test Agent",
    keyPrefix: "da_ag_testxx",
    scopes: ["leads:read", "analytics:read"],
    permittedWebsiteIds: [new ObjectId()],
    isActive: true,
    createdByUserId: new ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("roleFromAgentScopes", () => {
  it("maps websites:all to super_admin", () => {
    expect(roleFromAgentScopes(["websites:all", "leads:read"])).toBe(
      "super_admin"
    );
  });

  it("does not elevate users:write alone to super_admin", () => {
    expect(roleFromAgentScopes(["users:write", "users:read"])).toBe("admin");
  });

  it("maps website read/write scopes to admin", () => {
    expect(roleFromAgentScopes(["websites:read", "leads:read"])).toBe(
      "admin"
    );
  });

  it("maps lead write to sales_manager", () => {
    expect(roleFromAgentScopes(["leads:write", "leads:read"])).toBe(
      "sales_manager"
    );
  });

  it("maps analytics/leads read to marketing", () => {
    expect(roleFromAgentScopes(["leads:read", "analytics:read"])).toBe(
      "marketing"
    );
  });
});

describe("requireAgentScope", () => {
  it("allows when scope is present", () => {
    const agent = makeAgent({ scopes: ["leads:read"] });
    expect(() => requireAgentScope(agent, "leads:read")).not.toThrow();
    expect(agentHasScope(agent, "leads:read")).toBe(true);
  });

  it("throws ApiError when scope is missing", () => {
    const agent = makeAgent({ scopes: ["leads:read"] });
    expect(() => requireAgentScope(agent, "leads:write")).toThrow(ApiError);
    try {
      requireAgentScope(agent, "leads:delete");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("AGENT_SCOPE_DENIED");
      expect((error as ApiError).status).toBe(403);
    }
  });
});

describe("toSessionUserFromAgent", () => {
  it("uses permitted websites when websites:all is absent", () => {
    const websiteId = new ObjectId();
    const agent = makeAgent({
      scopes: ["leads:read"],
      permittedWebsiteIds: [websiteId],
    });
    const session = toSessionUserFromAgent(agent);
    expect(session.id).toBe(agent._id.toHexString());
    expect(session.permittedWebsiteIds).toEqual([websiteId.toHexString()]);
    expect(session.email).toContain("agent:");
  });

  it("clears permitted websites when websites:all is granted", () => {
    const agent = makeAgent({
      scopes: ["websites:all", "leads:read"],
      permittedWebsiteIds: [new ObjectId()],
    });
    const session = toSessionUserFromAgent(agent);
    expect(session.role).toBe("super_admin");
    expect(session.permittedWebsiteIds).toEqual([]);
  });
});
