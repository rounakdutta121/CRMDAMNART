import type { ObjectId } from "mongodb";

export type AuditEntityType =
  | "user"
  | "website"
  | "contact"
  | "lead"
  | "follow_up"
  | "integration"
  | "dashboard_share";

export interface AuditLog {
  _id: ObjectId;
  actingUserId?: ObjectId;
  actingSystem?: string;
  action: string;
  entityType: AuditEntityType;
  entityId: ObjectId;
  websiteId?: ObjectId;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: Date;
}
