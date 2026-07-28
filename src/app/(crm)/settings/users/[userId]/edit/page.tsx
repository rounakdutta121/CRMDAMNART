import { notFound, redirect } from "next/navigation";
import { EditUserForm } from "@/components/users/edit-user-form";
import { USER_ROLES } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";
import { getUserForAdmin } from "@/services/users.service";
import type { UserRole } from "@/types/auth";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const sessionUser = await requireSession();
  if (!canManageUsers(sessionUser.role)) {
    redirect("/dashboard");
  }

  const { userId } = await params;

  let targetUser;
  try {
    targetUser = await getUserForAdmin(sessionUser, userId);
  } catch {
    notFound();
  }

  const websites = await getAccessibleWebsites(sessionUser);
  const assignableRoles: UserRole[] =
    sessionUser.role === "super_admin"
      ? USER_ROLES
      : USER_ROLES.filter((role) => role !== "super_admin");

  return (
    <EditUserForm
      user={{
        id: targetUser._id.toHexString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        permittedWebsiteIds: targetUser.permittedWebsiteIds.map((id) =>
          id.toHexString()
        ),
        isActive: targetUser.isActive,
        canReceiveLeadAssignments: targetUser.canReceiveLeadAssignments,
        canViewUnassignedLeads: targetUser.canViewUnassignedLeads,
      }}
      websites={websites.map((website) => ({
        id: website._id.toHexString(),
        name: website.name,
      }))}
      assignableRoles={assignableRoles}
    />
  );
}
