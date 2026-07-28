import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { InvitationActions } from "@/components/invitations/invitation-actions";
import { ROLE_LABELS } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { canManageInvitations } from "@/lib/permissions";
import { listInvitationsForAdmin } from "@/services/invitations.service";

export default async function InvitationsPage() {
  const user = await requireSession();
  if (!canManageInvitations(user.role)) {
    redirect("/dashboard");
  }

  const invitations = await listInvitationsForAdmin(user);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users", href: "/settings/users" },
          { label: "Invitations" },
        ]}
      />
      <PageHeader
        title="Invitations"
        description="Pending and historical user invitations."
        actionLabel="Invite user"
        actionHref="/settings/users/invite"
      />

      <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                  No invitations yet.{" "}
                  <Link href="/settings/users/invite" className="underline">
                    Invite a user
                  </Link>
                </td>
              </tr>
            ) : (
              invitations.map((invitation) => (
                <tr key={invitation._id.toHexString()} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      {invitation.invitedName ? (
                        <p className="text-xs text-[var(--ink-muted)]">{invitation.invitedName}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[invitation.role]}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        invitation.status === "pending"
                          ? "default"
                          : invitation.status === "accepted"
                            ? "success"
                            : "secondary"
                      }
                    >
                      {invitation.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {format(invitation.expiresAt, "dd MMM yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <InvitationActions
                      invitationId={invitation._id.toHexString()}
                      status={invitation.status}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
