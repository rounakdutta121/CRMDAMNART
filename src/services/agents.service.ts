import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { canManageAiAgents, PermissionError } from "@/lib/permissions";
import {
  createAiAgent,
  deleteAiAgentById,
  findAiAgentById,
  listAiAgents,
  updateAiAgentById,
} from "@/repositories/agents.repository";
import { newAgentApiKeyMaterial } from "@/lib/agent-auth";
import type {
  CreateAiAgentInput,
  UpdateAiAgentInput,
} from "@/lib/validation/ai-agent.schema";
import type { AiAgentScope, SafeAiAgent } from "@/types/ai-agent";
import type { SessionUser } from "@/types/auth";
import { DEFAULT_AI_AGENT_SCOPES } from "@/types/ai-agent";

function assertCanManage(user: SessionUser): void {
  if (!canManageAiAgents(user.role)) {
    throw new PermissionError("You are not allowed to manage AI agents.");
  }
}

function asScopes(scopes: string[]): AiAgentScope[] {
  return scopes as AiAgentScope[];
}

function parseWebsiteIds(ids: string[]): ObjectId[] {
  return ids
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
}

function parseExpiresAt(
  value: string | null | undefined
): Date | undefined | null {
  if (value === null) return null;
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid expiresAt.");
  }
  return date;
}

export async function listAiAgentsForAdmin(
  user: SessionUser
): Promise<SafeAiAgent[]> {
  assertCanManage(user);
  return listAiAgents();
}

export async function getAiAgentForAdmin(
  user: SessionUser,
  agentId: string
): Promise<SafeAiAgent> {
  assertCanManage(user);
  const agent = await findAiAgentById(agentId);
  if (!agent) {
    throw new Error("AI agent not found.");
  }
  return agent;
}

export async function createAiAgentForAdmin(
  user: SessionUser,
  input: CreateAiAgentInput
): Promise<{ agent: SafeAiAgent; apiKey: string }> {
  assertCanManage(user);

  const material = newAgentApiKeyMaterial();
  const now = new Date();
  const scopes =
    input.scopes && input.scopes.length > 0
      ? asScopes(input.scopes)
      : [...DEFAULT_AI_AGENT_SCOPES];

  const hasAll = scopes.includes("websites:all");
  const websiteIds = parseWebsiteIds(input.permittedWebsiteIds);

  if (!hasAll && websiteIds.length === 0) {
    throw new Error(
      "Select at least one website, or grant the websites:all scope."
    );
  }

  const expiresAt = parseExpiresAt(input.expiresAt || undefined);
  const agent = await createAiAgent({
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    keyPrefix: material.keyPrefix,
    apiKeyHash: material.apiKeyHash,
    scopes,
    permittedWebsiteIds: websiteIds,
    isActive: true,
    createdByUserId: new ObjectId(user.id),
    expiresAt: expiresAt instanceof Date ? expiresAt : undefined,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "ai_agent.created",
    entityType: "ai_agent",
    entityId: agent._id,
    newValues: {
      name: agent.name,
      scopes: agent.scopes,
      keyPrefix: agent.keyPrefix,
    },
  });

  return { agent, apiKey: material.apiKey };
}

export async function updateAiAgentForAdmin(
  user: SessionUser,
  agentId: string,
  input: UpdateAiAgentInput
): Promise<SafeAiAgent> {
  assertCanManage(user);
  const existing = await findAiAgentById(agentId);
  if (!existing) {
    throw new Error("AI agent not found.");
  }

  const update: Parameters<typeof updateAiAgentById>[1] = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.description !== undefined) {
    update.description = input.description.trim() || undefined;
  }
  if (input.scopes !== undefined) update.scopes = asScopes(input.scopes);
  if (input.isActive !== undefined) update.isActive = input.isActive;

  if (input.permittedWebsiteIds !== undefined) {
    const scopes = asScopes(input.scopes ?? existing.scopes);
    const hasAll = scopes.includes("websites:all");
    // Keep selected website IDs for UI even with websites:all (auth still bypasses the list).
    update.permittedWebsiteIds = parseWebsiteIds(input.permittedWebsiteIds);
    if (!hasAll && (update.permittedWebsiteIds?.length ?? 0) === 0) {
      throw new Error(
        "Select at least one website, or grant the websites:all scope."
      );
    }
  }

  if (input.expiresAt !== undefined) {
    const parsed = parseExpiresAt(input.expiresAt);
    update.expiresAt = parsed === null ? undefined : parsed ?? undefined;
    if (input.expiresAt === null || input.expiresAt === "") {
      update.expiresAt = undefined;
    }
  }

  const updated = await updateAiAgentById(agentId, update);
  if (!updated) {
    throw new Error("AI agent not found.");
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: "ai_agent.updated",
    entityType: "ai_agent",
    entityId: agentId,
    previousValues: {
      name: existing.name,
      scopes: existing.scopes,
      isActive: existing.isActive,
    },
    newValues: {
      name: updated.name,
      scopes: updated.scopes,
      isActive: updated.isActive,
    },
  });

  return updated;
}

export async function rotateAiAgentKeyForAdmin(
  user: SessionUser,
  agentId: string
): Promise<{ agent: SafeAiAgent; apiKey: string }> {
  assertCanManage(user);
  const existing = await findAiAgentById(agentId);
  if (!existing) {
    throw new Error("AI agent not found.");
  }

  const material = newAgentApiKeyMaterial();
  const updated = await updateAiAgentById(agentId, {
    apiKeyHash: material.apiKeyHash,
    keyPrefix: material.keyPrefix,
    updatedAt: new Date(),
  });
  if (!updated) {
    throw new Error("AI agent not found.");
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: "ai_agent.key_rotated",
    entityType: "ai_agent",
    entityId: agentId,
    newValues: { keyPrefix: material.keyPrefix },
  });

  return { agent: updated, apiKey: material.apiKey };
}

export async function deleteAiAgentForAdmin(
  user: SessionUser,
  agentId: string
): Promise<void> {
  assertCanManage(user);
  const existing = await findAiAgentById(agentId);
  if (!existing) {
    throw new Error("AI agent not found.");
  }
  const deleted = await deleteAiAgentById(agentId);
  if (!deleted) {
    throw new Error("AI agent not found.");
  }
  await writeAuditLog({
    actingUserId: user.id,
    action: "ai_agent.deleted",
    entityType: "ai_agent",
    entityId: agentId,
    previousValues: { name: existing.name, keyPrefix: existing.keyPrefix },
  });
}
