import { ObjectId } from "mongodb";
import {
  assertCanAccessWebsite,
  canManageUsers,
  PermissionError,
} from "@/lib/permissions";
import { countLeads, listOpenLeadIdsForUser } from "@/repositories/leads.repository";
import { listUsers } from "@/repositories/users.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import type { SafeCRMUser, SessionUser } from "@/types/auth";

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export interface WebsiteTeamMember {
  user: SafeCRMUser;
  openLeads: number;
  leadsThisMonth: number;
}

export async function getWebsiteTeamForAdmin(
  user: SessionUser,
  websiteId: string
): Promise<{
  website: { id: string; name: string };
  members: WebsiteTeamMember[];
  eligibleUsers: SafeCRMUser[];
}> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to manage website teams.");
  }
  assertCanAccessWebsite(user, websiteId);

  const website = await findWebsiteById(websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  const websiteObjectId = new ObjectId(websiteId);
  const allUsers = await listUsers();
  const members = allUsers.filter(
    (member) =>
      member.role === "super_admin" ||
      member.permittedWebsiteIds.some((id) => id.equals(websiteObjectId))
  );

  const monthStart = startOfCurrentMonth();
  const enriched = await Promise.all(
    members.map(async (member) => {
      const userId = member._id.toHexString();
      const [openLeadIds, leadsThisMonth] = await Promise.all([
        listOpenLeadIdsForUser({ userId, websiteId }),
        countLeads({
          websiteIds: [websiteId],
          assignedUserId: userId,
          dateFrom: monthStart,
          excludeTestLeads: true,
        }),
      ]);

      return { user: member, openLeads: openLeadIds.length, leadsThisMonth };
    })
  );

  const eligibleUsers = allUsers.filter(
    (candidate) =>
      candidate.isActive &&
      !members.some((member) => member._id.equals(candidate._id))
  );

  return {
    website: { id: websiteId, name: website.name },
    members: enriched,
    eligibleUsers,
  };
}
