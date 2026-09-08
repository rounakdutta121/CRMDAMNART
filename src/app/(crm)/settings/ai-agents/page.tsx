import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { canManageAiAgents } from "@/lib/permissions";
import { serializeDate, serializeId } from "@/lib/serialization";
import { listAiAgentsForAdmin } from "@/services/agents.service";

export default async function AiAgentsSettingsPage() {
  const user = await requireSession();
  if (!canManageAiAgents(user.role)) {
    redirect("/dashboard");
  }

  const agents = await listAiAgentsForAdmin(user);

  const rows = agents.map((agent) => ({
    id: serializeId(agent._id),
    name: agent.name,
    keyPrefix: agent.keyPrefix,
    scopesCount: agent.scopes.length,
    isActive: agent.isActive,
    lastUsedAt: serializeDate(agent.lastUsedAt),
  }));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }, { label: "AI Agents" }]} />
      <PageHeader
        title="AI Agents"
        description="Issue scoped API keys so trusted AI agents can use the CRM REST API securely."
        actions={
          <Button asChild>
            <Link href="/settings/ai-agents/new">New agent</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Base URL: <code>/api/v1/agent</code>
          </p>
          <p>
            Auth: <code>Authorization: Bearer da_ag_…</code> or{" "}
            <code>x-api-key</code>
          </p>
          <p className="text-[var(--ink-muted)]">
            Default new agents are read-only. Grant write scopes deliberately.
            See Docs for endpoint reference.
          </p>
          <Link href="/docs" className="font-medium underline">
            Open docs
          </Link>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No AI agents yet. Create one to get a scoped API key.
          </p>
        ) : (
          rows.map((agent) => (
            <Card key={agent.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {agent.keyPrefix}… · {agent.scopesCount} scopes ·{" "}
                    {agent.isActive ? "Active" : "Inactive"}
                    {agent.lastUsedAt
                      ? ` · Last used ${agent.lastUsedAt}`
                      : " · Never used"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/settings/ai-agents/${agent.id}`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
