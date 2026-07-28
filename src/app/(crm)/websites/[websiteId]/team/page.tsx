import { notFound, redirect } from "next/navigation";
import { WebsiteTeamPanel } from "@/components/websites/website-team-panel";
import { requireSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { getWebsiteTeamForAdmin } from "@/services/website-team.service";
import type { SafeCRMUser } from "@/types/auth";

function serializeTeamUser(user: SafeCRMUser) {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role,
    canReceiveLeadAssignments: user.canReceiveLeadAssignments,
    canViewUnassignedLeads: user.canViewUnassignedLeads,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export default async function WebsiteTeamPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const user = await requireSession();
  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const { websiteId } = await params;
  let data;

  try {
    data = await getWebsiteTeamForAdmin(user, websiteId);
  } catch {
    notFound();
  }

  return (
    <WebsiteTeamPanel
      websiteId={websiteId}
      websiteName={data.website.name}
      members={data.members.map((member) => ({
        ...serializeTeamUser(member.user),
        openLeads: member.openLeads,
        leadsThisMonth: member.leadsThisMonth,
      }))}
      eligibleUsers={data.eligibleUsers.map(serializeTeamUser)}
    />
  );
}
