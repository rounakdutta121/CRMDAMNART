import { redirect } from "next/navigation";
import { NewUserForm } from "@/components/users/new-user-form";
import { USER_ROLES } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";
import type { UserRole } from "@/types/auth";

export default async function NewUserPage() {
  const user = await requireSession();
  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const websites = await getAccessibleWebsites(user);
  const assignableRoles: UserRole[] =
    user.role === "super_admin"
      ? USER_ROLES
      : USER_ROLES.filter((role) => role !== "super_admin");

  return (
    <NewUserForm
      websites={websites.map((website) => ({
        id: website._id.toHexString(),
        name: website.name,
      }))}
      assignableRoles={assignableRoles}
    />
  );
}
