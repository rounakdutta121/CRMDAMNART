import {
  apiSuccess,
  withAgentAuth,
} from "@/lib/agent-route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAgentAuth(request, async ({ agent }) => {
    return apiSuccess({
      id: agent._id.toHexString(),
      name: agent.name,
      description: agent.description ?? null,
      keyPrefix: agent.keyPrefix,
      scopes: agent.scopes,
      permittedWebsiteIds: agent.scopes.includes("websites:all")
        ? []
        : agent.permittedWebsiteIds.map((id) => id.toHexString()),
      websitesAll: agent.scopes.includes("websites:all"),
      isActive: agent.isActive,
      expiresAt: agent.expiresAt?.toISOString() ?? null,
      lastUsedAt: agent.lastUsedAt?.toISOString() ?? null,
    });
  });
}
