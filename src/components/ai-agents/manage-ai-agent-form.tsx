"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteAiAgentAction,
  rotateAiAgentKeyAction,
  updateAiAgentAction,
  type ActionResult,
} from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_AGENT_SCOPE_LABELS,
  AI_AGENT_SCOPES,
  type AiAgentScope,
} from "@/types/ai-agent";
import type { AiAgentClientView } from "@/types/ai-agent-client";

const initial: ActionResult = { success: false, message: "" };

export function ManageAiAgentForm({
  agent,
  websites,
  apiKeyOnce,
}: {
  agent: AiAgentClientView;
  websites: { id: string; name: string }[];
  apiKeyOnce?: string | null;
}) {
  const agentId = agent.id;
  const boundUpdate = updateAiAgentAction.bind(null, agentId);
  const [state, action, pending] = useActionState(boundUpdate, initial);
  const [rotateState, setRotateState] = useState<ActionResult | null>(null);
  const [scopes, setScopes] = useState<AiAgentScope[]>([...agent.scopes]);
  const [websiteIds, setWebsiteIds] = useState<string[]>([
    ...agent.permittedWebsiteIds,
  ]);
  const [shownKey, setShownKey] = useState(apiKeyOnce ?? "");

  const websitesAll = scopes.includes("websites:all");

  useEffect(() => {
    setScopes([...agent.scopes]);
    setWebsiteIds([...agent.permittedWebsiteIds]);
  }, [agent.id, agent.updatedAt, agent.scopes, agent.permittedWebsiteIds]);

  function toggleScope(scope: AiAgentScope) {
    setScopes((prev) => {
      const next = prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope];
      if (scope === "websites:all" && !prev.includes(scope)) {
        setWebsiteIds(websites.map((w) => w.id));
      }
      return next;
    });
  }

  function toggleWebsite(id: string) {
    if (websitesAll) return;
    setWebsiteIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }

  async function onRotate() {
    const result = await rotateAiAgentKeyAction(agentId);
    setRotateState(result);
    if (result.success && result.data?.apiKey) {
      setShownKey(String(result.data.apiKey));
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this AI agent? Its API key will stop working immediately."
      )
    ) {
      return;
    }
    await deleteAiAgentAction(agentId);
  }

  const effectiveWebsiteIds = websitesAll
    ? websites.map((w) => w.id)
    : websiteIds;

  return (
    <div>
      <GlobalLoadingSync pending={pending} />
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "AI Agents", href: "/settings/ai-agents" },
          { label: agent.name },
        ]}
      />
      <PageHeader
        title={agent.name}
        description={`Key prefix ${agent.keyPrefix}…`}
      />

      {shownKey ? (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-950">API key</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="block break-all text-sm">{shownKey}</code>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 max-w-3xl">
        <CardContent className="space-y-6 pt-6">
          <form action={action} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={agent.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={agent.description ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isActive">Status</Label>
              <select
                id="isActive"
                name="isActive"
                defaultValue={agent.isActive ? "true" : "false"}
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {AI_AGENT_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex items-start gap-2 rounded border border-[var(--border)] p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="scopes"
                      value={scope}
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">{scope}</span>
                      <span className="block text-[var(--ink-muted)]">
                        {AI_AGENT_SCOPE_LABELS[scope]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permitted websites</Label>
              {websitesAll ? (
                <p className="text-xs text-[var(--ink-muted)]">
                  <code>websites:all</code> is enabled — this agent can access
                  every website.
                </p>
              ) : (
                <p className="text-xs text-[var(--ink-muted)]">
                  Select at least one website, or grant the websites:all scope.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {websites.map((website) => (
                  <label
                    key={website.id}
                    className="flex items-center gap-2 rounded border border-[var(--border)] p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="permittedWebsiteIds"
                      value={website.id}
                      checked={effectiveWebsiteIds.includes(website.id)}
                      onChange={() => toggleWebsite(website.id)}
                      disabled={websitesAll}
                    />
                    {website.name}
                  </label>
                ))}
              </div>
            </div>

            {state.message ? (
              <p
                className={`text-sm ${state.success ? "text-green-700" : "text-red-700"}`}
              >
                {state.message}
              </p>
            ) : null}

            <Button type="submit" disabled={pending}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onRotate}>
          Rotate API key
        </Button>
        <Button type="button" variant="destructive" onClick={onDelete}>
          Delete agent
        </Button>
      </div>
      {rotateState?.message ? (
        <p
          className={`mt-3 text-sm ${rotateState.success ? "text-green-700" : "text-red-700"}`}
        >
          {rotateState.message}
        </p>
      ) : null}
    </div>
  );
}
