import { notFound, redirect } from "next/navigation";
import { NewFormForm } from "@/components/forms/new-form-form";
import { requireSession } from "@/lib/auth";
import { canManageForms } from "@/lib/permissions";
import { getAssignableUsers } from "@/services/auth.service";
import { listServicesForWebsite } from "@/repositories/services.repository";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function NewWebsiteFormPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const user = await requireSession();
  if (!canManageForms(user.role)) {
    redirect("/dashboard");
  }

  const { websiteId } = await params;

  let website;
  try {
    website = await getWebsiteForUser(user, websiteId);
  } catch {
    notFound();
  }

  const services = await listServicesForWebsite(websiteId, { isActive: true });
  const users = await getAssignableUsers([websiteId]);

  return (
    <NewFormForm
      websiteId={websiteId}
      websiteName={website.name}
      services={services.map((service) => ({
        id: service._id.toHexString(),
        name: service.name,
      }))}
      users={users.map((assignee) => ({
        id: assignee._id.toHexString(),
        name: assignee.name,
      }))}
    />
  );
}
