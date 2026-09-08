"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createAiAgentAction,
  type ActionResult,
} from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CopyButton } from "@/components/shared/copy-button";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_AGENT_SCOPE_LABELS,
  AI_AGENT_SCOPES,
  DEFAULT_AI_AGENT_SCOPES,
  type AiAgentScope,
} from "@/types/ai-agent";
import { useState } from "react";

const initial: ActionResult = { success: false, message: "" };

export function NewAiAgentForm({
  websites,
}: {
  websites: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createAiAgentAction, initial);
  const [scopes, setScopes] = useState<AiAgentScope[]>([
    ...DEFAULT_AI_AGENT_SCOPES,
  ]);

  function toggleScope(scope: AiAgentScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  const apiKey =
    state.success && state.data?.apiKey ? String(state.data.apiKey) : null;
  const agentId =
    state.success && state.data?.agentId ? String(state.data.agentId) : null;

  if (apiKey && agentId) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Settings" },
            { label: "AI Agents", href: "/settings/ai-agents" },
            { label: "New agent" },
          ]}
        />
        <PageHeader
          title="Agent created"
          description="Copy the API key now — it will not be shown again."
        />
        <Card className="max-w-3xl border-amber-300 bg-amber-50">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-amber-950">{state.message}</p>
            <code className="block break-all rounded border border-amber-200 bg-white p-3 text-sm text-amber-950">
              {apiKey}
            </code>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={apiKey} label="Copy API key" />
              <Button asChild>
                <Link href={`/settings/ai-agents/${agentId}`}>
                  Continue to agent
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <GlobalLoadingSync pending={pending} />
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "AI Agents", href: "/settings/ai-agents" },
          { label: "New agent" },
        ]}
      />
      <PageHeader
        title="Create AI agent"
        description="Issue a hashed API key with explicit scopes and website access."
      />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form action={action} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Ops Claude agent" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional notes"
              />
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
              <p className="text-xs text-[var(--ink-muted)]">
                Required unless you grant websites:all.
              </p>
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
                    />
                    {website.name}
                  </label>
                ))}
              </div>
            </div>

            {!state.success && state.message ? (
              <p className="text-sm text-red-700">{state.message}</p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create agent"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
