import type { ObjectId } from "mongodb";

export type UserRole =
  | "super_admin"
  | "admin"
  | "sales_manager"
  | "sales_executive"
  | "operations"
  | "marketing"
  | "viewer";

export interface CRMUser {
  _id: ObjectId;
  name: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  role: UserRole;
  permittedWebsiteIds: ObjectId[];
  canReceiveLeadAssignments: boolean;
  canViewUnassignedLeads: boolean;
  isActive: boolean;
  sessionVersion: number;
  invitedThroughInvitationId?: ObjectId;
  invitedByUserId?: ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeCRMUser = Omit<CRMUser, "passwordHash">;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permittedWebsiteIds: string[];
  canReceiveLeadAssignments: boolean;
  canViewUnassignedLeads: boolean;
  sessionVersion: number;
}
