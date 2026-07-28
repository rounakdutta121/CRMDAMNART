import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FULFILMENT_STATUSES,
  FULFILMENT_STATUS_LABELS,
  SALES_STATUSES,
  SALES_STATUS_LABELS,
} from "@/lib/constants";
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
        description="Canonical sales and fulfilment statuses used across the CRM."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales statuses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {SALES_STATUSES.map((status) => (
                <li key={status} className="flex justify-between gap-3">
                  <span className="text-[var(--ink)]">
                    {SALES_STATUS_LABELS[status]}
                  </span>
                  <code className="text-xs text-[var(--ink-muted)]">{status}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fulfilment statuses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {FULFILMENT_STATUSES.map((status) => (
                <li key={status} className="flex justify-between gap-3">
                  <span className="text-[var(--ink)]">
                    {FULFILMENT_STATUS_LABELS[status]}
                  </span>
                  <code className="text-xs text-[var(--ink-muted)]">{status}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
