import { notFound, redirect } from "next/navigation";
import { ServiceForm } from "@/components/services/service-form";
import { requireSession } from "@/lib/auth";
import { canManageServices } from "@/lib/permissions";
import { getAssignableUsers } from "@/services/auth.service";
import { getAccessibleWebsites } from "@/services/websites.service";
import { getServiceForUser } from "@/services/services.service";

export default async function EditServicePage({
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
  const users = await getAssignableUsers();

  return (
    <ServiceForm
      mode="edit"
      service={{
        id: service._id.toHexString(),
        name: service.name,
        category: service.category,
        description: service.description,
        websiteIds: service.websiteIds.map((id) => id.toHexString()),
        defaultLeadValue: service.defaultLeadValue,
        defaultCurrency: service.defaultCurrency,
        defaultLeadOwnerId: service.defaultLeadOwnerId?.toHexString(),
        isActive: service.isActive,
      }}
      websites={websites.map((website) => ({
        id: website._id.toHexString(),
        name: website.name,
      }))}
      users={users.map((assignee) => ({
        id: assignee._id.toHexString(),
        name: assignee.name,
      }))}
    />
  );
}
