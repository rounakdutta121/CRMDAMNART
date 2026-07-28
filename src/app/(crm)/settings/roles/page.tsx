import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import { requireSession } from "@/lib/auth";

const ROLE_SUMMARIES: Record<(typeof USER_ROLES)[number], string> = {
  super_admin:
    "Full access across all websites, users, integrations, leads and audit data.",
  admin:
    "Manage permitted websites, leads, assignments, CRM configuration and reports.",
  sales_manager:
    "View and assign leads, update sales statuses, manage follow-ups and team reports.",
  sales_executive:
    "Work assigned/unassigned leads, add notes, log attempts and update permitted statuses.",
  operations:
    "Update onboarding, fulfilment and completion for confirmed customers.",
  marketing:
    "View attribution, GCLID/UTM data, campaign reports and conversion upload status.",
  viewer: "Read-only access to permitted websites.",
};

export default async function RolesSettingsPage() {
  await requireSession();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Roles" }]} />
      <PageHeader
        title="Roles"
        description="Permission model enforced on the server for every CRM action."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {USER_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle>{ROLE_LABELS[role]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--ink-muted)]">{ROLE_SUMMARIES[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
