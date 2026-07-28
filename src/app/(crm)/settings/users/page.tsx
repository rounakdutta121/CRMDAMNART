import Link from "next/link";
import { format } from "date-fns";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { getUsersForAdmin } from "@/services/users.service";
import { redirect } from "next/navigation";

export default async function UsersSettingsPage() {
  const user = await requireSession();
  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const users = await getUsersForAdmin(user);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users" },
        ]}
      />
      <PageHeader
        title="Users"
        description="CRM users are provisioned by administrators. Public registration is disabled."
        actionLabel="Create user"
        actionHref="/settings/users/new"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/settings/users/invitations">Invitations</Link>
        </Button>
      </div>

      <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Websites</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item._id.toHexString()} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/settings/users/${item._id.toHexString()}`}
                    className="text-[var(--ink)] hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[item.role]}</td>
                <td className="px-4 py-3">
                  {item.role === "super_admin"
                    ? "All"
                    : item.permittedWebsiteIds.length}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? "success" : "secondary"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {format(item.createdAt, "dd MMM yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
