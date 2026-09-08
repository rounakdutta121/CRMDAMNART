import Link from "next/link";
import { deleteWebsiteAction } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { canManageWebsites } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const canManage = canManageWebsites(user.role);

  const websites = await getAccessibleWebsites(user, {
    isActive:
      status === "active" ? true : status === "inactive" ? false : undefined,
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Websites" }]} />
      <PageHeader
        title="Websites"
        description="Manage DamnArt websites, landing domains and webhook endpoints."
        actionLabel={canManage ? "Add website" : undefined}
        actionHref={canManage ? "/websites/new" : undefined}
      />

      <div className="mb-4 flex gap-2">
        <Button asChild variant={!status ? "default" : "outline"} size="sm">
          <Link href="/websites">All</Link>
        </Button>
        <Button
          asChild
          variant={status === "active" ? "default" : "outline"}
          size="sm"
        >
          <Link href="/websites?status=active">Active</Link>
        </Button>
        <Button
          asChild
          variant={status === "inactive" ? "default" : "outline"}
          size="sm"
        >
          <Link href="/websites?status=inactive">Inactive</Link>
        </Button>
      </div>

      {websites.length === 0 ? (
        <EmptyState
          title="No websites yet"
          description="Create your first website to receive leads through a dedicated webhook."
          actionLabel={canManage ? "Add website" : undefined}
          actionHref={canManage ? "/websites/new" : undefined}
        />
      ) : (
        <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage ? (
                  <th className="px-4 py-3 font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {websites.map((website) => {
                const websiteId = website._id.toHexString();
                return (
                  <tr
                    key={websiteId}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/websites/${websiteId}`}
                        className="font-medium text-[var(--ink)] hover:underline"
                      >
                        {website.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {website.code}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {website.primaryDomain}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      {website.brandName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={website.isActive ? "success" : "secondary"}
                      >
                        {website.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <DeleteEntityButton
                          size="sm"
                          label="Delete"
                          confirmMessage={`Permanently delete website "${website.name}" from the database? Forms and shares for this site will also be removed. This cannot be undone. Sites with leads cannot be deleted.`}
                          action={deleteWebsiteAction.bind(null, websiteId)}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
