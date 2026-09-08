import { ObjectId } from "mongodb";
import { ApiError } from "@/lib/api-auth";
import {
  generateAgentApiKey,
  hashApiKey,
  verifyApiKey,
} from "@/lib/crypto";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  findAiAgentByApiKeyHash,
  touchAiAgentLastUsed,
} from "@/repositories/agents.repository";
import type { AiAgent, AiAgentScope, SafeAiAgent } from "@/types/ai-agent";
import type { SessionUser, UserRole } from "@/types/auth";

export type AuthenticatedAgent = SafeAiAgent & { apiKeyHash: string };

function extractApiKey(request: Request): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token) return token;
  }
  const headerKey = request.headers.get("x-api-key");
  return headerKey?.trim() || null;
}

export function roleFromAgentScopes(scopes: AiAgentScope[]): UserRole {
  // Only websites:all elevates to super_admin (bypasses website allowlists).
  // Never map users:write alone to super_admin — that enabled privilege escalation.
  if (scopes.includes("websites:all")) {
    return "super_admin";
  }
  if (
    scopes.some((scope) =>
      [
        "websites:write",
        "websites:delete",
        "websites:read",
        "forms:write",
        "forms:delete",
        "forms:read",
        "services:write",
        "services:read",
        "leads:delete",
        "leads:import",
        "users:read",
        "users:write",
      ].includes(scope)
    )
  ) {
    return "admin";
  }
  if (
    scopes.some((scope) =>
      [
        "leads:write",
        "leads:assign",
        "leads:export",
        "contacts:write",
        "contacts:merge",
      ].includes(scope)
    )
  ) {
    return "sales_manager";
  }
  if (
    scopes.includes("analytics:read") ||
    scopes.includes("leads:read") ||
    scopes.includes("contacts:read")
  ) {
    return "marketing";
  }
  return "viewer";
}

export function toSessionUserFromAgent(agent: SafeAiAgent): SessionUser {
  const hasAllWebsites = agent.scopes.includes("websites:all");
  return {
    id: agent._id.toHexString(),
    name: agent.name,
    email: `agent:${agent.keyPrefix}@agents.local`,
    role: roleFromAgentScopes(agent.scopes),
    permittedWebsiteIds: hasAllWebsites
      ? []
      : agent.permittedWebsiteIds.map((id) => id.toHexString()),
    canReceiveLeadAssignments: false,
    canViewUnassignedLeads: true,
    sessionVersion: 1,
  };
}

export function agentHasScope(
  agent: Pick<AiAgent, "scopes">,
  scope: AiAgentScope
): boolean {
  return agent.scopes.includes(scope);
}

export function requireAgentScope(
  agent: Pick<AiAgent, "scopes">,
  scope: AiAgentScope
): void {
  if (!agentHasScope(agent, scope)) {
    throw new ApiError(
      403,
      "AGENT_SCOPE_DENIED",
      `Missing required scope: ${scope}`
    );
  }
}

export function requireAnyAgentScope(
  agent: Pick<AiAgent, "scopes">,
  scopes: AiAgentScope[]
): void {
  if (!scopes.some((scope) => agentHasScope(agent, scope))) {
    throw new ApiError(
      403,
      "AGENT_SCOPE_DENIED",
      `Missing one of required scopes: ${scopes.join(", ")}`
    );
  }
}

function getAgentRateLimits(): { perMinute: number; perHour: number } {
  const perMinute = Number(process.env.AGENT_RATE_LIMIT_PER_MINUTE ?? "120");
  const perHour = Number(process.env.AGENT_RATE_LIMIT_PER_HOUR ?? "2000");
  return {
    perMinute: Number.isFinite(perMinute) && perMinute > 0 ? perMinute : 120,
    perHour: Number.isFinite(perHour) && perHour > 0 ? perHour : 2000,
  };
}

export async function requireAgentAuth(
  request: Request
): Promise<{ agent: AuthenticatedAgent; sessionUser: SessionUser }> {
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    throw new ApiError(
      401,
      "AGENT_UNAUTHORIZED",
      "Missing agent API key. Use Authorization: Bearer <key> or x-api-key."
    );
  }

  if (!apiKey.startsWith("da_ag_")) {
    throw new ApiError(401, "AGENT_UNAUTHORIZED", "Invalid agent API key.");
  }

  const apiKeyHash = hashApiKey(apiKey);
  const stored = await findAiAgentByApiKeyHash(apiKeyHash);
  if (!stored || !verifyApiKey(apiKey, stored.apiKeyHash)) {
    throw new ApiError(401, "AGENT_UNAUTHORIZED", "Invalid agent API key.");
  }

  if (!stored.isActive) {
    throw new ApiError(403, "AGENT_INACTIVE", "This AI agent is deactivated.");
  }

  if (stored.expiresAt && stored.expiresAt.getTime() < Date.now()) {
    throw new ApiError(403, "AGENT_EXPIRED", "This AI agent key has expired.");
  }

  const limits = getAgentRateLimits();
  const agentId = stored._id.toHexString();
  const minute = await consumeRateLimit({
    scope: "agent:minute",
    identifier: agentId,
    maxRequests: limits.perMinute,
    windowMs: 60_000,
  });
  if (!minute.allowed) {
    throw new ApiError(
      429,
      "AGENT_RATE_LIMITED",
      "Agent rate limit exceeded (per minute)."
    );
  }
  const hour = await consumeRateLimit({
    scope: "agent:hour",
    identifier: agentId,
    maxRequests: limits.perHour,
    windowMs: 60 * 60_000,
  });
  if (!hour.allowed) {
    throw new ApiError(
      429,
      "AGENT_RATE_LIMITED",
      "Agent rate limit exceeded (per hour)."
    );
  }

  void touchAiAgentLastUsed(stored._id);

  const { apiKeyHash: hash, ...safe } = stored;
  const agent: AuthenticatedAgent = { ...safe, apiKeyHash: hash };
  return { agent, sessionUser: toSessionUserFromAgent(agent) };
}

export function newAgentApiKeyMaterial(): {
  apiKey: string;
  apiKeyHash: string;
  keyPrefix: string;
} {
  const apiKey = generateAgentApiKey();
  return {
    apiKey,
    apiKeyHash: hashApiKey(apiKey),
    keyPrefix: apiKey.slice(0, 12),
  };
}

export function actingSystemForAgent(agentId: string | ObjectId): string {
  const id = typeof agentId === "string" ? agentId : agentId.toHexString();
  return `ai_agent:${id}`;
}
