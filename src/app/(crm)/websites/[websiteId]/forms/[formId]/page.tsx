import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { deleteFormAction } from "@/app/actions";
import { requireSession } from "@/lib/auth";
import { canManageForms } from "@/lib/permissions";
import {
  buildSampleFormPayload,
  getFormForUser,
} from "@/services/forms.service";
import { getWebsiteForUser } from "@/services/websites.service";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="text-[var(--ink-muted)]">{label}</dt>
      <dd className="col-span-2 break-words text-[var(--ink)]">{value || "—"}</dd>
    </div>
  );
}

export default async function WebsiteFormDetailPage({
  params,
}: {
  params: Promise<{ websiteId: string; formId: string }>;
}) {
  const user = await requireSession();
  const { websiteId, formId } = await params;

  let website;
  let form;
  try {
    website = await getWebsiteForUser(user, websiteId);
    form = await getFormForUser(user, formId);
    if (form.websiteId.toHexString() !== websiteId) {
      notFound();
    }
  } catch {
    notFound();
  }

  const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/v1/webhooks/leads/${website.webhookKey}`;
  const samplePayload = buildSampleFormPayload(form);
  const sampleJson = JSON.stringify(samplePayload, null, 2);
  const activeFields = form.fields
    .filter((field) => field.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: website.name, href: `/websites/${websiteId}` },
          { label: "Forms", href: `/websites/${websiteId}/forms` },
          { label: form.name },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title={form.name} description={form.code} />
        <div className="flex flex-wrap gap-2">
          {canManageForms(user.role) ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/websites/${websiteId}/forms/${formId}/edit`}>
                  Edit fields
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/websites/${websiteId}/forms/${formId}/test`}>
                  Test submission
                </Link>
              </Button>
              {form.isActive ? (
                <DeleteEntityButton
                  label="Delete form"
                  confirmMessage={`Delete form "${form.name}"? It will be deactivated and stop accepting submissions.`}
                  redirectTo={`/websites/${websiteId}/forms`}
                  action={deleteFormAction.bind(null, websiteId, formId)}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={form.isActive ? "success" : "secondary"}>
          {form.isActive ? "Active" : "Inactive"}
        </Badge>
        <Badge variant="secondary">Schema v{form.schemaVersion}</Badge>
        <Badge variant="secondary">{form.schemaMode}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Form settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label="Description" value={form.description} />
            <DetailRow label="Page URL" value={form.pageUrl} />
            <DetailRow label="Contact identity" value={form.contactIdentityRule} />
            <DetailRow label="Unknown fields" value={form.unknownFieldPolicy} />
            <DetailRow
              label="Attribution"
              value={form.attributionEnabled ? "Enabled" : "Disabled"}
            />
            <DetailRow label="Active fields" value={activeFields.length} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration</CardTitle>
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
            <p className="text-[var(--ink-muted)]">
              Include <code>formCode</code> and <code>formName</code> in the JSON
              body. Send <code>x-api-key</code> and optionally{" "}
              <code>x-idempotency-key</code> headers.
            </p>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[var(--ink-muted)]">Sample payload</p>
                <CopyButton value={sampleJson} label="Copy JSON" />
              </div>
              <pre className="max-h-80 overflow-auto rounded-md bg-[var(--surface)] p-3 text-xs text-[var(--ink)]">
                {sampleJson}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Field mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden border border-[var(--border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Incoming key</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Maps to</th>
                  <th className="px-4 py-3 font-medium">Required</th>
                </tr>
              </thead>
              <tbody>
                {activeFields.map((field) => (
                  <tr key={field.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium">{field.label}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">{field.incomingKey}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">{field.fieldType}</td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {field.canonicalTarget}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {field.required ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
