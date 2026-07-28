import { redirect } from "next/navigation";
import { ServiceForm } from "@/components/services/service-form";
import { requireSession } from "@/lib/auth";
import { canManageServices } from "@/lib/permissions";
import { getAssignableUsers } from "@/services/auth.service";
import { getAccessibleWebsites } from "@/services/websites.service";

export default async function NewServicePage() {
  const user = await requireSession();
  if (!canManageServices(user.role)) {
    redirect("/dashboard");
  }

  const websites = await getAccessibleWebsites(user);
  const users = await getAssignableUsers();

  return (
    <ServiceForm
      mode="create"
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
