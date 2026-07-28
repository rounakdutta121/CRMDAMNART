import Link from "next/link";
import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { UserActionsPanel } from "@/components/users/user-actions-panel";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";
import { getUserForAdmin } from "@/services/users.service";

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

export default async function UserDetailPage({
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
  const websiteMap = new Map(
    websites.map((website) => [website._id.toHexString(), website.name])
  );

  const permittedWebsiteNames =
    targetUser.role === "super_admin"
      ? ["All websites"]
      : targetUser.permittedWebsiteIds.map(
          (id) => websiteMap.get(id.toHexString()) ?? id.toHexString()
        );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users", href: "/settings/users" },
          { label: targetUser.name },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={targetUser.name}
          description={targetUser.email}
        />
        <Button asChild variant="outline">
          <Link href={`/settings/users/${userId}/edit`}>Edit user</Link>
        </Button>
      </div>

      <div className="mb-4">
        <Badge variant={targetUser.isActive ? "success" : "secondary"}>
          {targetUser.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DetailRow label="Name" value={targetUser.name} />
            <DetailRow label="Email" value={targetUser.email} />
            <DetailRow label="Role" value={ROLE_LABELS[targetUser.role]} />
            <DetailRow
              label="Websites"
              value={permittedWebsiteNames.join(", ")}
            />
            <DetailRow
              label="Created"
              value={format(targetUser.createdAt, "dd MMM yyyy HH:mm")}
            />
            <DetailRow
              label="Updated"
              value={format(targetUser.updatedAt, "dd MMM yyyy HH:mm")}
            />
          </CardContent>
        </Card>

        <UserActionsPanel
          userId={userId}
          isActive={targetUser.isActive}
          canDeactivate={sessionUser.id !== userId}
        />
      </div>
    </div>
  );
}
