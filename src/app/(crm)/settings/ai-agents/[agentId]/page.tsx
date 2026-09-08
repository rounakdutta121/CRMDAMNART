import { notFound, redirect } from "next/navigation";
import { ManageAiAgentForm } from "@/components/ai-agents/manage-ai-agent-form";
import { requireSession } from "@/lib/auth";
import { canManageAiAgents } from "@/lib/permissions";
import { serializeDate, serializeId } from "@/lib/serialization";
import { getAiAgentForAdmin } from "@/services/agents.service";
import { getAccessibleWebsites } from "@/services/websites.service";
import type { AiAgentClientView } from "@/types/ai-agent-client";

export default async function AiAgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await requireSession();
  if (!canManageAiAgents(user.role)) {
    redirect("/dashboard");
  }

  const { agentId } = await params;

  let agent;
  try {
    agent = await getAiAgentForAdmin(user, agentId);
  } catch {
    notFound();
  }

  const websites = await getAccessibleWebsites(user);

  const clientAgent: AiAgentClientView = {
    id: serializeId(agent._id),
    name: agent.name,
    description: agent.description ?? null,
    keyPrefix: agent.keyPrefix,
    scopes: agent.scopes,
    permittedWebsiteIds: agent.permittedWebsiteIds.map(serializeId),
    isActive: agent.isActive,
    createdByUserId: serializeId(agent.createdByUserId),
    expiresAt: serializeDate(agent.expiresAt),
    lastUsedAt: serializeDate(agent.lastUsedAt),
    createdAt: serializeDate(agent.createdAt) ?? new Date().toISOString(),
    updatedAt: serializeDate(agent.updatedAt) ?? new Date().toISOString(),
  };

  return (
    <ManageAiAgentForm
      agent={clientAgent}
      websites={websites.map((w) => ({
        id: w._id.toHexString(),
        name: w.name,
      }))}
    />
  );
}
