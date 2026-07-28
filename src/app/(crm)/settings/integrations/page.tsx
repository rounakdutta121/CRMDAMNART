import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { canManageIntegrations } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";
import { redirect } from "next/navigation";

export default async function IntegrationsSettingsPage() {
  const user = await requireSession();
  if (!canManageIntegrations(user.role)) {
    redirect("/dashboard");
  }

  const websites = await getAccessibleWebsites(user);
  const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Integrations" }]} />
      <PageHeader
        title="Integrations"
        description="Connect websites, n8n and Google Apps Script through per-website webhooks."
      />

      <p className="mb-4 text-sm">
        <Link href="/settings/integrations/logs" className="font-medium underline">
          View integration logs
        </Link>
      </p>

      <div className="space-y-4">
        {websites.map((website) => {
          const webhookUrl = `${appUrl}/api/v1/webhooks/leads/${website.webhookKey}`;
          return (
            <Card key={website._id.toHexString()}>
              <CardHeader>
                <CardTitle>{website.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="break-all">
                  <span className="text-[var(--ink-muted)]">Webhook: </span>
                  <code>{webhookUrl}</code>
                </p>
                <p className="text-[var(--ink-muted)]">
                  Headers: <code>x-api-key</code>, optional{" "}
                  <code>x-idempotency-key</code>
                </p>
                <Link
                  href={`/websites/${website._id.toHexString()}`}
                  className="font-medium underline"
                >
                  Open website settings
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
