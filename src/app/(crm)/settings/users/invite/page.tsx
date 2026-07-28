import { redirect } from "next/navigation";
import { InviteUserForm } from "@/components/invitations/invite-user-form";
import { USER_ROLES } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { canManageInvitations } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";
import type { UserRole } from "@/types/auth";

export default async function InviteUserPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  if (!canManageInvitations(user.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const websiteIdParam = params.websiteId;
  const preselectedWebsiteIds = Array.isArray(websiteIdParam)
    ? websiteIdParam
    : websiteIdParam
      ? [websiteIdParam]
      : [];

  const websites = await getAccessibleWebsites(user);
  const assignableRoles: UserRole[] =
    user.role === "super_admin"
      ? USER_ROLES
      : USER_ROLES.filter((role) => role !== "super_admin");

  return (
    <InviteUserForm
      websites={websites.map((website) => ({
        id: website._id.toHexString(),
        name: website.name,
      }))}
      assignableRoles={assignableRoles}
      preselectedWebsiteIds={preselectedWebsiteIds.filter((id) =>
        websites.some((website) => website._id.toHexString() === id)
      )}
    />
  );
}
