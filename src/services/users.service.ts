import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/crypto";
import { normalizeEmail } from "@/lib/normalization";
import {
  canManageUsers,
  canTransferLeads,
  defaultCanReceiveLeadAssignments,
  defaultCanViewUnassignedLeads,
  PermissionError,
} from "@/lib/permissions";
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateUserInput,
} from "@/lib/validation/user.schema";
import type { RemoveWebsiteAccessInput, TransferLeadsInput } from "@/lib/validation/dashboard-share.schema";
import {
  createUser,
  findUserById,
  findUserByNormalizedEmail,
  incrementSessionVersion,
  listUsers,
  updateUser,
  updateUserPassword,
} from "@/repositories/users.repository";
import { bulkUpdateLeads, findLeadById, listOpenLeadIdsForUser } from "@/repositories/leads.repository";
import { createAssignmentHistory } from "@/repositories/assignment-history.repository";
import { notifyLeadAssignment } from "@/repositories/notifications.repository";
import type { SessionUser, SafeCRMUser, UserRole } from "@/types/auth";

export async function getUsersForAdmin(
  user: SessionUser
): Promise<SafeCRMUser[]> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to manage users.");
  }
  return listUsers();
}

export async function getUserForAdmin(
  user: SessionUser,
  userId: string
): Promise<SafeCRMUser> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to manage users.");
  }

  const target = await findUserById(userId);
  if (!target) {
    throw new Error("User not found.");
  }

  const { passwordHash: _, ...safe } = target;
  void _;
  return safe;
}

export async function createUserForAdmin(
  user: SessionUser,
  input: CreateUserInput
): Promise<SafeCRMUser> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to create users.");
  }

  if (input.role === "super_admin" && user.role !== "super_admin") {
    throw new PermissionError(
      "Only a super admin can assign the super admin role."
    );
  }

  const normalizedEmail = normalizeEmail(input.email);
  const existing = await findUserByNormalizedEmail(normalizedEmail);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const created = await createUser({
    name: input.name.trim(),
    email: input.email.trim(),
    normalizedEmail,
    passwordHash,
    role: input.role as UserRole,
    permittedWebsiteIds: input.permittedWebsiteIds.map((id) => new ObjectId(id)),
    canReceiveLeadAssignments:
      input.canReceiveLeadAssignments ??
      defaultCanReceiveLeadAssignments(input.role as UserRole),
    canViewUnassignedLeads:
      input.canViewUnassignedLeads ??
      defaultCanViewUnassignedLeads(input.role as UserRole),
    isActive: input.isActive ?? true,
    sessionVersion: 1,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "user.created",
    entityType: "user",
    entityId: created._id,
    newValues: {
      name: created.name,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
    },
  });

  return created;
}

export async function updateUserForAdmin(
  user: SessionUser,
  userId: string,
  input: UpdateUserInput
): Promise<SafeCRMUser> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to update users.");
  }

  const existing = await findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  assertCanManageTargetUser(user, existing);

  if (
    input.role === "super_admin" &&
    user.role !== "super_admin"
  ) {
    throw new PermissionError(
      "Only a super admin can assign the super admin role."
    );
  }

  const update: Parameters<typeof updateUser>[1] = {};

  if (input.name !== undefined) {
    update.name = input.name.trim();
  }

  if (input.email !== undefined) {
    const normalizedEmail = normalizeEmail(input.email);
    const conflict = await findUserByNormalizedEmail(normalizedEmail);
    if (conflict && conflict._id.toHexString() !== userId) {
      throw new Error("A user with this email already exists.");
    }
    update.email = input.email.trim();
    update.normalizedEmail = normalizedEmail;
  }

  if (input.role !== undefined) {
    update.role = input.role as UserRole;
  }

  if (input.permittedWebsiteIds !== undefined) {
    update.permittedWebsiteIds = input.permittedWebsiteIds.map(
      (id) => new ObjectId(id)
    );
  }

  if (input.isActive !== undefined) {
    if (input.isActive === false) {
      assertCanDeactivateTargetUser(user, existing);
    }
    update.isActive = input.isActive;
  }

  if (input.canReceiveLeadAssignments !== undefined) {
    update.canReceiveLeadAssignments = input.canReceiveLeadAssignments;
  }

  if (input.canViewUnassignedLeads !== undefined) {
    update.canViewUnassignedLeads = input.canViewUnassignedLeads;
  }

  await updateUser(userId, update);

  await writeAuditLog({
    actingUserId: user.id,
    action: input.isActive === false ? "user.deactivated" : "user.updated",
    entityType: "user",
    entityId: userId,
    previousValues: {
      name: existing.name,
      email: existing.email,
      role: existing.role,
      isActive: existing.isActive,
    },
    newValues: update as Record<string, unknown>,
  });

  const updated = await findUserById(userId);
  if (!updated) {
    throw new Error("User not found after update.");
  }

  const { passwordHash: _, ...safe } = updated;
  void _;
  return safe;
}

export async function resetPasswordForAdmin(
  user: SessionUser,
  userId: string,
  input: ResetPasswordInput
): Promise<void> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to reset passwords.");
  }

  const existing = await findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  assertCanManageTargetUser(user, existing);

  const passwordHash = await hashPassword(input.password);
  await updateUserPassword(userId, passwordHash);

  await writeAuditLog({
    actingUserId: user.id,
    action: "user.password_reset",
    entityType: "user",
    entityId: userId,
  });
}

export async function deactivateUserForAdmin(
  user: SessionUser,
  userId: string
): Promise<SafeCRMUser> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to deactivate users.");
  }

  if (user.id === userId) {
    throw new Error("You cannot deactivate your own account.");
  }

  const existing = await findUserById(userId);
  if (!existing) {
    throw new Error("User not found.");
  }

  assertCanDeactivateTargetUser(user, existing);

  if (!existing.isActive) {
    const { passwordHash: _, ...safe } = existing;
    void _;
    return safe;
  }

  await updateUser(userId, { isActive: false });
  await incrementSessionVersion(userId);

  await writeAuditLog({
    actingUserId: user.id,
    action: "user.deactivated",
    entityType: "user",
    entityId: userId,
    previousValues: { isActive: true },
    newValues: { isActive: false },
  });

  const refreshed = await findUserById(userId);
  if (!refreshed) {
    throw new Error("User not found.");
  }

  const { passwordHash: _, ...safe } = refreshed;
  void _;
  return safe;
}

function assertCanManageTargetUser(
  actor: SessionUser,
  target: { role: UserRole }
): void {
  if (target.role === "super_admin" && actor.role !== "super_admin") {
    throw new PermissionError(
      "Admins cannot modify, deactivate, or delete a super admin account."
    );
  }
}

function assertCanDeactivateTargetUser(
  actor: SessionUser,
  target: { role: UserRole }
): void {
  assertCanManageTargetUser(actor, target);
}

export async function transferLeadsForAdmin(
  user: SessionUser,
  input: TransferLeadsInput
): Promise<{ transferred: number }> {
  if (!canTransferLeads(user.role)) {
    throw new PermissionError("You are not allowed to transfer leads.");
  }

  const leadIds = await listOpenLeadIdsForUser({
    userId: input.fromUserId,
    websiteId: input.websiteId,
  });

  if (leadIds.length === 0) {
    return { transferred: 0 };
  }

  const now = new Date();
  const nextUserId = input.unassignOnly
    ? undefined
    : input.toUserId
      ? new ObjectId(input.toUserId)
      : undefined;

  for (const leadId of leadIds) {
    const lead = await findLeadById(leadId);
    if (!lead) {
      continue;
    }

    await createAssignmentHistory({
      leadId: lead._id,
      websiteId: lead.websiteId,
      previousUserId: lead.assignedUserId,
      newUserId: nextUserId,
      changedByUserId: new ObjectId(user.id),
      createdAt: now,
    });

    if (nextUserId) {
      await notifyLeadAssignment({
        userId: nextUserId,
        type: "lead_reassigned",
        leadId: lead._id,
        websiteId: lead.websiteId,
        leadNumber: lead.leadNumber,
        actingUserId: new ObjectId(user.id),
      });
    }
  }

  const transferred = await bulkUpdateLeads(leadIds, {
    assignedUserId: nextUserId,
    status: nextUserId ? "assigned" : "new",
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "lead.bulk_transferred",
    entityType: "user",
    entityId: input.fromUserId,
    newValues: {
      leadCount: transferred,
      toUserId: input.toUserId ?? null,
      websiteId: input.websiteId ?? null,
    },
  });

  return { transferred };
}

export async function addWebsiteAccessForAdmin(
  user: SessionUser,
  userId: string,
  websiteId: string
): Promise<SafeCRMUser> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to manage website access.");
  }

  const target = await findUserById(userId);
  if (!target) {
    throw new Error("User not found.");
  }

  const websiteObjectId = new ObjectId(websiteId);
  if (
    target.permittedWebsiteIds.some((id) => id.equals(websiteObjectId)) ||
    target.role === "super_admin"
  ) {
    throw new Error("User already has access to this website.");
  }

  await updateUser(userId, {
    permittedWebsiteIds: [...target.permittedWebsiteIds, websiteObjectId],
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "user.website_access_granted",
    entityType: "user",
    entityId: userId,
    websiteId,
  });

  const updated = await findUserById(userId);
  if (!updated) {
    throw new Error("User not found after update.");
  }

  const { passwordHash: _, ...safe } = updated;
  void _;
  return safe;
}

export async function removeWebsiteAccessForAdmin(
  user: SessionUser,
  input: RemoveWebsiteAccessInput
): Promise<{ leadsUpdated: number }> {
  if (!canManageUsers(user.role)) {
    throw new PermissionError("You are not allowed to manage website access.");
  }

  const target = await findUserById(input.userId);
  if (!target) {
    throw new Error("User not found.");
  }

  const websiteObjectId = new ObjectId(input.websiteId);
  const nextWebsiteIds = target.permittedWebsiteIds.filter(
    (id) => !id.equals(websiteObjectId)
  );

  if (nextWebsiteIds.length === target.permittedWebsiteIds.length) {
    throw new Error("User does not have access to this website.");
  }

  let leadsUpdated = 0;
  if (input.unassignLeads) {
    const leadIds = await listOpenLeadIdsForUser({
      userId: input.userId,
      websiteId: input.websiteId,
    });

    if (leadIds.length > 0) {
      const now = new Date();
      const nextUserId = input.reassignToUserId
        ? new ObjectId(input.reassignToUserId)
        : undefined;

      for (const leadId of leadIds) {
        const lead = await findLeadById(leadId);
        if (!lead) {
          continue;
        }

        await createAssignmentHistory({
          leadId: lead._id,
          websiteId: lead.websiteId,
          previousUserId: lead.assignedUserId,
          newUserId: nextUserId,
          changedByUserId: new ObjectId(user.id),
          createdAt: now,
        });

        if (nextUserId) {
          await notifyLeadAssignment({
            userId: nextUserId,
            type: "lead_reassigned",
            leadId: lead._id,
            websiteId: lead.websiteId,
            leadNumber: lead.leadNumber,
            actingUserId: new ObjectId(user.id),
          });
        }
      }

      leadsUpdated = await bulkUpdateLeads(leadIds, {
        assignedUserId: nextUserId,
        status: nextUserId ? "assigned" : "new",
      });
    }
  }

  await updateUser(input.userId, {
    permittedWebsiteIds: nextWebsiteIds,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "user.website_access_removed",
    entityType: "user",
    entityId: input.userId,
    websiteId: input.websiteId,
    newValues: {
      websiteId: input.websiteId,
      leadsUpdated,
      reassignToUserId: input.reassignToUserId ?? null,
    },
  });

  return { leadsUpdated };
}
