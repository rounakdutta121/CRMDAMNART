import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import {
  LEAD_STATUS_LABELS,
  MAX_BULK_ACTION_SIZE,
} from "@/lib/constants";
import {
  assertCanAccessWebsite,
  assertCanAssignLeadToUser,
  assertCanViewLead,
  canAssignLeads,
  canChangeStatus,
  canPerformBulkActions,
  PermissionError,
} from "@/lib/permissions";
import type { BulkLeadActionInput } from "@/lib/validation/bulk.schema";
import { createActivity } from "@/repositories/activities.repository";
import { createAssignmentHistory } from "@/repositories/assignment-history.repository";
import {
  bulkUpdateLeads,
  findLeadById,
} from "@/repositories/leads.repository";
import { findUserById } from "@/repositories/users.repository";
import type { SessionUser } from "@/types/auth";
import type { LeadPriority, LeadStatus } from "@/types/lead";

export interface BulkActionResult {
  updated: number;
  skipped: number;
  errors: string[];
}

async function validateLeadAccess(
  user: SessionUser,
  leadIds: string[]
): Promise<{ accessibleIds: string[]; skipped: number }> {
  const accessibleIds: string[] = [];
  let skipped = 0;

  for (const leadId of leadIds) {
    const lead = await findLeadById(leadId);
    if (!lead) {
      skipped += 1;
      continue;
    }

    try {
      assertCanAccessWebsite(user, lead.websiteId.toHexString());
      assertCanViewLead(user, lead);
      accessibleIds.push(leadId);
    } catch {
      skipped += 1;
    }
  }

  return { accessibleIds, skipped };
}

export async function performBulkLeadAction(
  user: SessionUser,
  input: BulkLeadActionInput
): Promise<BulkActionResult> {
  if (!canPerformBulkActions(user.role)) {
    throw new PermissionError("You are not allowed to perform bulk actions.");
  }

  if (input.leadIds.length > MAX_BULK_ACTION_SIZE) {
    throw new Error(`Bulk actions are limited to ${MAX_BULK_ACTION_SIZE} leads.`);
  }

  const { accessibleIds, skipped } = await validateLeadAccess(
    user,
    input.leadIds
  );

  if (accessibleIds.length === 0) {
    return { updated: 0, skipped, errors: ["No accessible leads found."] };
  }

  const now = new Date();
  const errors: string[] = [];

  if (input.action === "assign") {
    if (!canAssignLeads(user.role)) {
      throw new PermissionError("You are not allowed to assign leads.");
    }

    const assignedUserId = input.assignedUserId
      ? new ObjectId(input.assignedUserId)
      : undefined;

    if (assignedUserId) {
      const assignee = await findUserById(assignedUserId.toHexString());
      for (const leadId of accessibleIds) {
        const lead = await findLeadById(leadId);
        if (!lead) {
          continue;
        }
        assertCanAssignLeadToUser(assignee, lead.websiteId);
      }
    }

    for (const leadId of accessibleIds) {
      const lead = await findLeadById(leadId);
      if (!lead) {
        continue;
      }

      await createAssignmentHistory({
        leadId: lead._id,
        websiteId: lead.websiteId,
        previousUserId: lead.assignedUserId,
        newUserId: assignedUserId,
        changedByUserId: new ObjectId(user.id),
        createdAt: now,
      });

      await createActivity({
        leadId: lead._id,
        contactId: lead.contactId,
        websiteId: lead.websiteId,
        type: "assignment_changed",
        description: assignedUserId
          ? "Lead assignment updated via bulk action."
          : "Lead unassigned via bulk action.",
        metadata: {
          previous: lead.assignedUserId?.toHexString() ?? null,
          next: assignedUserId?.toHexString() ?? null,
        },
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });
    }

    const updated = await bulkUpdateLeads(accessibleIds, {
      assignedUserId,
      status: assignedUserId ? "assigned" : "new",
    });

    await writeAuditLog({
      actingUserId: user.id,
      action: "lead.bulk_assigned",
      entityType: "lead",
      entityId: accessibleIds[0]!,
      newValues: {
        leadCount: updated,
        assignedUserId: input.assignedUserId,
      },
    });

    return { updated, skipped, errors };
  }

  if (input.action === "change_status") {
    if (!canChangeStatus(user.role)) {
      throw new PermissionError("You are not allowed to change status.");
    }

    const update = {
      status: input.status as LeadStatus,
    };

    const updated = await bulkUpdateLeads(accessibleIds, update);

    for (const leadId of accessibleIds) {
      const lead = await findLeadById(leadId);
      if (!lead) {
        continue;
      }

      await createActivity({
        leadId: lead._id,
        contactId: lead.contactId,
        websiteId: lead.websiteId,
        type: "status_changed",
        description: `Status changed to ${LEAD_STATUS_LABELS[update.status]}.`,
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });
    }

    await writeAuditLog({
      actingUserId: user.id,
      action: "lead.bulk_status_changed",
      entityType: "lead",
      entityId: accessibleIds[0]!,
      newValues: {
        leadCount: updated,
        ...update,
      },
    });

    return { updated, skipped, errors };
  }

  if (input.action === "change_priority") {
    const updated = await bulkUpdateLeads(accessibleIds, {
      priority: input.priority as LeadPriority,
    });

    await writeAuditLog({
      actingUserId: user.id,
      action: "lead.bulk_priority_changed",
      entityType: "lead",
      entityId: accessibleIds[0]!,
      newValues: {
        leadCount: updated,
        priority: input.priority,
      },
    });

    return { updated, skipped, errors };
  }

  const updated = await bulkUpdateLeads(accessibleIds, {
    status: "spam_invalid",
  });

  for (const leadId of accessibleIds) {
    const lead = await findLeadById(leadId);
    if (!lead) {
      continue;
    }

    await createActivity({
      leadId: lead._id,
      contactId: lead.contactId,
      websiteId: lead.websiteId,
      type: "status_changed",
      description: "Lead marked as spam via bulk action.",
      createdByUserId: new ObjectId(user.id),
      createdAt: now,
    });
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: "lead.bulk_marked_spam",
    entityType: "lead",
    entityId: accessibleIds[0]!,
    newValues: { leadCount: updated },
  });

  return { updated, skipped, errors };
}
