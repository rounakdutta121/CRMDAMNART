import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { FOLLOW_UP_METHOD_LABELS } from "@/lib/constants";
import { buildPaginatedResult, parsePagination } from "@/lib/pagination";
import {
  assertCanAccessWebsite,
  canManageFollowUps,
  PermissionError,
  resolveWebsiteFilter,
} from "@/lib/permissions";
import type { ScheduleFollowUpInput } from "@/lib/validation/lead.schema";
import { createActivity } from "@/repositories/activities.repository";
import { findContactById } from "@/repositories/contacts.repository";
import {
  createFollowUp,
  findFollowUpById,
  listFollowUps,
  updateFollowUp,
  withDynamicStatus,
} from "@/repositories/follow-ups.repository";
import { findLeadById, updateLead } from "@/repositories/leads.repository";
import { listAssignableUsers } from "@/repositories/users.repository";
import { listWebsites } from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";
import type { FollowUpMethod } from "@/types/follow-up";

export async function scheduleFollowUp(
  user: SessionUser,
  leadId: string,
  input: ScheduleFollowUpInput
) {
  if (!canManageFollowUps(user.role)) {
    throw new PermissionError("You are not allowed to schedule follow-ups.");
  }

  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }

  assertCanAccessWebsite(user, lead.websiteId.toHexString());

  const assignedUserId = input.assignedUserId || user.id;
  const scheduledAt = new Date(input.scheduledAt);
  const now = new Date();

  const followUp = await createFollowUp({
    leadId: lead._id,
    contactId: lead.contactId,
    websiteId: lead.websiteId,
    assignedUserId: new ObjectId(assignedUserId),
    method: input.method as FollowUpMethod,
    scheduledAt,
    status: "pending",
    note: input.note?.trim() || undefined,
    createdByUserId: new ObjectId(user.id),
    createdAt: now,
    updatedAt: now,
  });

  await updateLead(leadId, {
    nextFollowUpAt: scheduledAt,
    salesStatus:
      lead.salesStatus === "new" || lead.salesStatus === "assigned"
        ? "follow_up_required"
        : lead.salesStatus,
  });

  await createActivity({
    leadId: lead._id,
    contactId: lead.contactId,
    websiteId: lead.websiteId,
    type: "follow_up_scheduled",
    description: `Follow-up scheduled (${FOLLOW_UP_METHOD_LABELS[input.method as FollowUpMethod]}) for ${scheduledAt.toISOString()}.`,
    metadata: {
      followUpId: followUp._id.toHexString(),
      method: input.method,
      scheduledAt: scheduledAt.toISOString(),
    },
    createdByUserId: new ObjectId(user.id),
    createdAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "follow_up.created",
    entityType: "follow_up",
    entityId: followUp._id,
    websiteId: lead.websiteId,
    newValues: {
      method: input.method,
      scheduledAt: scheduledAt.toISOString(),
      assignedUserId,
    },
  });

  return followUp;
}

export async function completeFollowUp(user: SessionUser, followUpId: string) {
  if (!canManageFollowUps(user.role)) {
    throw new PermissionError("You are not allowed to complete follow-ups.");
  }

  const followUp = await findFollowUpById(followUpId);
  if (!followUp) {
    throw new Error("Follow-up not found.");
  }

  assertCanAccessWebsite(user, followUp.websiteId.toHexString());

  const now = new Date();
  await updateFollowUp(followUpId, {
    status: "completed",
    completedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "follow_up.completed",
    entityType: "follow_up",
    entityId: followUpId,
    websiteId: followUp.websiteId,
  });
}

export async function getFollowUpsPage(
  user: SessionUser,
  searchParams: Record<string, string | string[] | undefined>
) {
  const pagination = parsePagination(searchParams);
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const websiteIds = resolveWebsiteFilter(user, get("websiteId"));
  const view = get("view") ?? "my";
  let assignedUserId = get("assignedUserId");
  let status = get("status");

  if (view === "my") {
    assignedUserId = user.id;
  } else if (view === "team") {
    assignedUserId = undefined;
  } else if (view === "due_today") {
    status = "due_today";
  } else if (view === "overdue") {
    status = "overdue";
  } else if (view === "upcoming") {
    status = "upcoming";
  } else if (view === "completed") {
    status = "completed";
  } else if (view === "cancelled") {
    status = "cancelled";
  }

  const { items, total } = await listFollowUps({
    websiteIds,
    assignedUserId,
    status,
    view,
    skip: pagination.skip,
    limit: pagination.limit,
  });

  const withStatus = items.map(withDynamicStatus);
  const websites = await listWebsites(
    websiteIds === null ? undefined : { ids: websiteIds }
  );
  const users = await listAssignableUsers();
  const websiteMap = new Map(websites.map((w) => [w._id.toHexString(), w]));
  const userMap = new Map(users.map((u) => [u._id.toHexString(), u]));

  const enriched = await Promise.all(
    withStatus.map(async (followUp) => {
      const [lead, contact] = await Promise.all([
        findLeadById(followUp.leadId.toHexString()),
        findContactById(followUp.contactId.toHexString()),
      ]);
      return {
        followUp,
        lead,
        contact,
        website: websiteMap.get(followUp.websiteId.toHexString()) ?? null,
        assignedUser:
          userMap.get(followUp.assignedUserId.toHexString()) ?? null,
      };
    })
  );

  return {
    ...buildPaginatedResult(
      enriched,
      total,
      pagination.page,
      pagination.pageSize
    ),
    websites,
    users,
    view: view ?? null,
  };
}
