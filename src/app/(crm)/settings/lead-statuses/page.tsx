import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { requireSession } from "@/lib/auth";

export default async function LeadStatusesSettingsPage() {
  await requireSession();

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Settings" }, { label: "Lead statuses" }]}
      />
      <PageHeader
        title="Lead statuses"
        description="Canonical pipeline statuses used across the CRM."
      />

      <Card>
        <CardHeader>
          <CardTitle>Lead statuses</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {LEAD_STATUSES.map((status) => (
              <li key={status} className="flex justify-between gap-3">
                <span className="text-[var(--ink)]">
                  {LEAD_STATUS_LABELS[status]}
                </span>
                <code className="text-xs text-[var(--ink-muted)]">{status}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
