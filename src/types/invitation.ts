import type { ObjectId } from "mongodb";
import type { UserRole } from "@/types/auth";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type InvitationExpiryHours = 24 | 72 | 168 | 336;

export interface UserInvitation {
  _id: ObjectId;
  email: string;
  normalizedEmail: string;
  invitedName?: string;
  role: UserRole;
  permittedWebsiteIds: ObjectId[];
  canReceiveLeadAssignments: boolean;
  canViewUnassignedLeads: boolean;
  note?: string;
  tokenHash: string;
  status: InvitationStatus;
  invitedByUserId: ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedUserId?: ObjectId;
  revokedAt?: Date;
  revokedByUserId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUserInvitation = Omit<UserInvitation, "tokenHash">;
