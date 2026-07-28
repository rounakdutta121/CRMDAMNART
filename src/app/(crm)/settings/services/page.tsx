import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { canManageServices } from "@/lib/permissions";
import { getServicesForUser } from "@/services/services.service";

export default async function ServicesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  if (!canManageServices(user.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const services = await getServicesForUser(user, {
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Services" }]} />
      <PageHeader
        title="Services"
        description="Catalogue services offered across DamnArt websites."
        actionLabel="Create service"
        actionHref="/settings/services/new"
      />

      <div className="mb-4 flex gap-2">
        <Button asChild variant={!status ? "default" : "outline"} size="sm">
          <Link href="/settings/services">All</Link>
        </Button>
        <Button asChild variant={status === "active" ? "default" : "outline"} size="sm">
          <Link href="/settings/services?status=active">Active</Link>
        </Button>
        <Button asChild variant={status === "inactive" ? "default" : "outline"} size="sm">
          <Link href="/settings/services?status=inactive">Inactive</Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Create services to use as defaults on forms and manual lead entry."
          actionLabel="Create service"
          actionHref="/settings/services/new"
        />
      ) : (
        <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Websites</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service._id.toHexString()}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/settings/services/${service._id.toHexString()}`}
                      className="font-medium text-[var(--ink)] hover:underline"
                    >
                      {service.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{service.code}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {service.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    {service.websiteIds.length}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={service.isActive ? "success" : "secondary"}>
                      {service.isActive ? "Active" : "Inactive"}
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
