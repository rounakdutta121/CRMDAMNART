"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createDashboardShareAction,
  type ActionResult,
} from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DASHBOARD_PERIOD_LABELS,
  DASHBOARD_PERIOD_PRESETS,
} from "@/lib/constants";
import {
  PERFORMANCE_CHARTS,
  PERFORMANCE_METRICS,
  PERFORMANCE_TABLES,
} from "@/lib/validation/dashboard-share.schema";

const initial: ActionResult = { success: false, message: "" };

export function NewDashboardShareForm({
  websiteId,
  websiteName,
}: {
  websiteId: string;
  websiteName: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createDashboardShareAction, initial);

  useEffect(() => {
    if (state.success && "data" in state && state.data?.shareId) {
      router.push(
        `/websites/${websiteId}/performance/shares/${state.data.shareId}`
      );
    }
  }, [state, websiteId, router]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: websiteName, href: `/websites/${websiteId}` },
          { label: "Performance", href: `/websites/${websiteId}/performance` },
          { label: "Shares", href: `/websites/${websiteId}/performance/shares` },
          { label: "New" },
        ]}
      />
      <PageHeader
        title="New share dashboard"
        description="Configure a branded, aggregate-only public dashboard."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <input type="hidden" name="websiteId" value={websiteId} />
            <input
              type="hidden"
              name="visibleMetrics"
              value={JSON.stringify([...PERFORMANCE_METRICS])}
            />
            <input
              type="hidden"
              name="visibleCharts"
              value={JSON.stringify([...PERFORMANCE_CHARTS])}
            />
            <input
              type="hidden"
              name="visibleTables"
              value={JSON.stringify([...PERFORMANCE_TABLES])}
            />
            <input
              type="hidden"
              name="branding"
              value={JSON.stringify({
                displayName: websiteName,
                showDamnArtBranding: true,
              })}
            />
            <input
              type="hidden"
              name="access"
              value={JSON.stringify({
                passwordProtected: false,
                allowCsvDownload: false,
              })}
            />

            <div className="space-y-2">
              <Label htmlFor="name">Internal name</Label>
              <Input id="name" name="name" required defaultValue={`${websiteName} report`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Dashboard title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue="Website Lead Performance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodPreset">Reporting period</Label>
              <select
                id="periodPreset"
                name="periodPreset"
                defaultValue="last_month"
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
              >
                {DASHBOARD_PERIOD_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {DASHBOARD_PERIOD_LABELS[preset]}
                  </option>
                ))}
              </select>
            </div>

            {state.message && !state.success ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {state.message}
              </p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create share"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
