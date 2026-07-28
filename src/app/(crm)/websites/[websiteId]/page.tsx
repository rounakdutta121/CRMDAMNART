import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { canManageWebsites } from "@/lib/permissions";
import { getWebsiteForUser } from "@/services/websites.service";
import { RegenerateApiKeyButton } from "@/components/websites/regenerate-api-key-button";

export default async function WebsiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const { websiteId } = await params;
  const query = await searchParams;

  let website;
  try {
    website = await getWebsiteForUser(user, websiteId);
  } catch {
    notFound();
  }

  const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/v1/webhooks/leads/${website.webhookKey}`;
  const apiKeyOnce =
    typeof query.apiKey === "string" ? decodeURIComponent(query.apiKey) : null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: website.name },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={website.name}
          description={`${website.primaryDomain} · ${website.code}`}
        />
        {canManageWebsites(user.role) ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/websites/${websiteId}/edit`}>Edit website</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/websites/${websiteId}/forms`}>Manage forms</Link>
            </Button>
          </div>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/websites/${websiteId}/forms`}>View forms</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/websites/${websiteId}/dashboard`}>Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/websites/${websiteId}/performance`}>Performance</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/websites/${websiteId}/team`}>Team</Link>
        </Button>
      </div>

      {apiKeyOnce ? (
        <Card className="mb-4 border-amber-200 bg-[var(--warning-muted)]">
          <CardHeader>
            <CardTitle className="text-amber-900">API key (shown once)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all text-sm text-amber-950">{apiKeyOnce}</code>
            <CopyButton value={apiKeyOnce} label="Copy API key" />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Website details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              <Badge variant={website.isActive ? "success" : "secondary"}>
                {website.isActive ? "Active" : "Inactive"}
              </Badge>
            </Row>
            <Row label="Brand">{website.brandName ?? "—"}</Row>
            <Row label="Division">{website.businessDivision ?? "—"}</Row>
            <Row label="Currency">{website.defaultCurrency}</Row>
            <Row label="Timezone">{website.timezone}</Row>
            <Row label="Additional domains">
              {website.additionalDomains.length > 0
                ? website.additionalDomains.join(", ")
                : "—"}
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook & API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-[var(--ink-muted)]">Webhook URL</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 break-all rounded-md bg-[var(--surface)] px-3 py-2 text-xs">
                  {webhookUrl}
                </code>
                <CopyButton value={webhookUrl} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-[var(--ink-muted)]">Webhook key</p>
              <code className="rounded-md bg-[var(--surface)] px-3 py-2 text-xs">
                {website.webhookKey}
              </code>
            </div>
            <p className="text-[var(--ink-muted)]">
              Send <code>x-api-key</code> and optionally{" "}
              <code>x-idempotency-key</code> headers with each submission.
            </p>
            {canManageWebsites(user.role) ? (
              <RegenerateApiKeyButton websiteId={websiteId} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="text-right text-[var(--ink)]">{children}</span>
    </div>
  );
}
