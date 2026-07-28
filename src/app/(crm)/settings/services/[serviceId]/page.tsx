import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { canManageServices } from "@/lib/permissions";
import { findUserById } from "@/repositories/users.repository";
import { getAccessibleWebsites } from "@/services/websites.service";
import { getServiceForUser } from "@/services/services.service";

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

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const user = await requireSession();
  if (!canManageServices(user.role)) {
    redirect("/dashboard");
  }

  const { serviceId } = await params;

  let service;
  try {
    service = await getServiceForUser(user, serviceId);
  } catch {
    notFound();
  }

  const websites = await getAccessibleWebsites(user);
  const websiteMap = new Map(
    websites.map((website) => [website._id.toHexString(), website.name])
  );

  const owner = service.defaultLeadOwnerId
    ? await findUserById(service.defaultLeadOwnerId.toHexString())
    : null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Services", href: "/settings/services" },
          { label: service.name },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title={service.name} description={service.code} />
        <Button asChild variant="outline">
          <Link href={`/settings/services/${serviceId}/edit`}>Edit service</Link>
        </Button>
      </div>

      <div className="mb-4">
        <Badge variant={service.isActive ? "success" : "secondary"}>
          {service.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Category" value={service.category} />
          <DetailRow label="Description" value={service.description} />
          <DetailRow
            label="Default lead value"
            value={
              service.defaultLeadValue !== undefined
                ? `${service.defaultCurrency} ${service.defaultLeadValue}`
                : undefined
            }
          />
          <DetailRow label="Default owner" value={owner?.name} />
          <DetailRow
            label="Websites"
            value={service.websiteIds
              .map((id) => websiteMap.get(id.toHexString()) ?? id.toHexString())
              .join(", ")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
