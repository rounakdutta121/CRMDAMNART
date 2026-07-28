import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { canManageForms } from "@/lib/permissions";
import { getFormsForWebsite } from "@/services/forms.service";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function WebsiteFormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const { websiteId } = await params;
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : undefined;

  let website;
  try {
    website = await getWebsiteForUser(user, websiteId);
  } catch {
    notFound();
  }

  const forms = await getFormsForWebsite(user, websiteId, {
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  });

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: website.name, href: `/websites/${websiteId}` },
          { label: "Forms" },
        ]}
      />
      <PageHeader
        title="Forms"
        description={`Dynamic form schemas for ${website.name}.`}
        actionLabel={canManageForms(user.role) ? "Create form" : undefined}
        actionHref={
          canManageForms(user.role)
            ? `/websites/${websiteId}/forms/new`
            : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        <Button asChild variant={!status ? "default" : "outline"} size="sm">
          <Link href={`/websites/${websiteId}/forms`}>All</Link>
        </Button>
        <Button asChild variant={status === "active" ? "default" : "outline"} size="sm">
          <Link href={`/websites/${websiteId}/forms?status=active`}>Active</Link>
        </Button>
        <Button asChild variant={status === "inactive" ? "default" : "outline"} size="sm">
          <Link href={`/websites/${websiteId}/forms?status=inactive`}>Inactive</Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Create a form schema to map incoming webhook fields to CRM leads."
          actionLabel={canManageForms(user.role) ? "Create form" : undefined}
          actionHref={
            canManageForms(user.role)
              ? `/websites/${websiteId}/forms/new`
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Fields</th>
                <th className="px-4 py-3 font-medium">Schema</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr
                  key={form._id.toHexString()}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/websites/${websiteId}/forms/${form._id.toHexString()}`}
                      className="font-medium text-[var(--ink)] hover:underline"
                    >
                      {form.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{form.code}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {form.fields.filter((field) => field.active).length}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    v{form.schemaVersion}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={form.isActive ? "success" : "secondary"}>
                      {form.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
