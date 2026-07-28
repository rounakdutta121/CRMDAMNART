import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyTokenHash,
} from "@/lib/crypto";
import { normalizeEmail } from "@/lib/normalization";
import {
  canManageInvitations,
  defaultCanReceiveLeadAssignments,
  defaultCanViewUnassignedLeads,
  PermissionError,
} from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
} from "@/lib/validation/invitation.schema";
import {
  createInvitation,
  expireStaleInvitations,
  findInvitationById,
  findInvitationByTokenHash,
  findPendingInvitationByEmail,
  listInvitations,
  revokePendingInvitationsForEmail,
  updateInvitation,
} from "@/repositories/invitations.repository";
import { createNotification } from "@/repositories/notifications.repository";
import {
  createUser,
  findUserByNormalizedEmail,
} from "@/repositories/users.repository";
import type { SafeCRMUser, SessionUser } from "@/types/auth";
import type { SafeUserInvitation } from "@/types/invitation";

export interface InvitationAcceptancePreview {
  email: string;
  invitedName?: string;
  role: SafeUserInvitation["role"];
  expiresAt: Date;
}

export async function listInvitationsForAdmin(
  user: SessionUser
): Promise<SafeUserInvitation[]> {
  if (!canManageInvitations(user.role)) {
    throw new PermissionError("You are not allowed to manage invitations.");
  }
  await expireStaleInvitations();
  return listInvitations();
}

export async function createInvitationForAdmin(
  user: SessionUser,
  input: CreateInvitationInput
): Promise<{ invitation: SafeUserInvitation; token: string }> {
  if (!canManageInvitations(user.role)) {
    throw new PermissionError("You are not allowed to create invitations.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await findUserByNormalizedEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  await revokePendingInvitationsForEmail(
    normalizedEmail,
    new ObjectId(user.id)
  );

  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + input.expiryHours * 60 * 60 * 1000
  );

  const invitation = await createInvitation({
    email: input.email.trim(),
    normalizedEmail,
    invitedName: input.invitedName?.trim(),
    role: input.role as SafeUserInvitation["role"],
    permittedWebsiteIds: input.permittedWebsiteIds.map((id) => new ObjectId(id)),
    canReceiveLeadAssignments:
      input.canReceiveLeadAssignments ??
      defaultCanReceiveLeadAssignments(input.role as SafeUserInvitation["role"]),
    canViewUnassignedLeads:
      input.canViewUnassignedLeads ??
      defaultCanViewUnassignedLeads(input.role as SafeUserInvitation["role"]),
    note: input.note?.trim(),
    tokenHash,
    status: "pending",
    invitedByUserId: new ObjectId(user.id),
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "invitation.created",
    entityType: "user",
    entityId: invitation._id,
    newValues: {
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  return { invitation, token };
}

export async function revokeInvitationForAdmin(
  user: SessionUser,
  invitationId: string
): Promise<void> {
  if (!canManageInvitations(user.role)) {
    throw new PermissionError("You are not allowed to revoke invitations.");
  }

  const invitation = await findInvitationById(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }
  if (invitation.status !== "pending") {
    throw new Error("Only pending invitations can be revoked.");
  }

  const now = new Date();
  await updateInvitation(invitationId, {
    status: "revoked",
    revokedAt: now,
    revokedByUserId: new ObjectId(user.id),
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "invitation.revoked",
    entityType: "user",
    entityId: invitationId,
  });
}

export async function regenerateInvitationForAdmin(
  user: SessionUser,
  invitationId: string
): Promise<{ invitation: SafeUserInvitation; token: string }> {
  if (!canManageInvitations(user.role)) {
    throw new PermissionError("You are not allowed to regenerate invitations.");
  }

  const invitation = await findInvitationById(invitationId);
  if (!invitation) {
    throw new Error("Invitation not found.");
  }
  if (invitation.status !== "pending" && invitation.status !== "expired") {
    throw new Error("Only pending or expired invitations can be regenerated.");
  }

  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  await updateInvitation(invitationId, {
    tokenHash,
    status: "pending",
    expiresAt,
    revokedAt: undefined,
    revokedByUserId: undefined,
  });

  const updated = await findInvitationById(invitationId);
  if (!updated) {
    throw new Error("Invitation not found after regeneration.");
  }

  const { tokenHash: _, ...safe } = updated;
  void _;

  await writeAuditLog({
    actingUserId: user.id,
    action: "invitation.regenerated",
    entityType: "user",
    entityId: invitationId,
  });

  return { invitation: safe, token };
}

export async function getInvitationAcceptancePreview(
  token: string
): Promise<
  | { ok: true; preview: InvitationAcceptancePreview }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "accepted" }
> {
  await expireStaleInvitations();
  const invitation = await findInvitationByTokenHash(hashToken(token));
  if (!invitation) {
    return { ok: false, reason: "invalid" };
  }
  if (invitation.status === "accepted") {
    return { ok: false, reason: "accepted" };
  }
  if (invitation.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (invitation.status === "expired" || invitation.expiresAt <= new Date()) {
    if (invitation.status === "pending") {
      await updateInvitation(invitation._id.toHexString(), { status: "expired" });
    }
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    preview: {
      email: invitation.email,
      invitedName: invitation.invitedName,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    },
  };
}

export async function acceptInvitation(
  token: string,
  input: AcceptInvitationInput
): Promise<SafeCRMUser> {
  const rateLimit = await consumeRateLimit({
    scope: "invitation:accept",
    identifier: hashToken(token),
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    throw new Error("Too many invitation attempts. Please try again later.");
  }

  const preview = await getInvitationAcceptancePreview(token);
  if (!preview.ok) {
    throw new Error(`Invitation is ${preview.reason}.`);
  }

  const invitation = await findInvitationByTokenHash(hashToken(token));
  if (!invitation || !verifyTokenHash(token, invitation.tokenHash)) {
    throw new Error("Invalid invitation.");
  }

  const normalizedEmail = invitation.normalizedEmail;
  const existingUser = await findUserByNormalizedEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const pending = await findPendingInvitationByEmail(normalizedEmail);
  if (!pending || pending._id.toHexString() !== invitation._id.toHexString()) {
    throw new Error("Invitation is no longer valid.");
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const created = await createUser({
    name: input.name.trim(),
    email: invitation.email,
    normalizedEmail,
    passwordHash,
    role: invitation.role,
    permittedWebsiteIds: invitation.permittedWebsiteIds,
    canReceiveLeadAssignments: invitation.canReceiveLeadAssignments,
    canViewUnassignedLeads: invitation.canViewUnassignedLeads,
    isActive: true,
    sessionVersion: 1,
    invitedThroughInvitationId: invitation._id,
    invitedByUserId: invitation.invitedByUserId,
    createdAt: now,
    updatedAt: now,
  });

  await updateInvitation(invitation._id.toHexString(), {
    status: "accepted",
    acceptedAt: now,
    acceptedUserId: created._id,
  });

  await createNotification({
    userId: invitation.invitedByUserId,
    type: "invitation_accepted",
    title: "Invitation accepted",
    message: `${created.name} accepted their invitation.`,
    entityType: "user",
    entityId: created._id,
    isRead: false,
    createdAt: now,
  });

  await writeAuditLog({
    actingUserId: created._id.toHexString(),
    action: "invitation.accepted",
    entityType: "user",
    entityId: created._id,
    newValues: { email: created.email, role: created.role },
  });

  return created;
}
