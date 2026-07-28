import type { ObjectId } from "mongodb";

export type NotificationType =
  | "lead_assigned"
  | "lead_reassigned"
  | "lead_unassigned"
  | "follow_up_due"
  | "invitation_accepted"
  | "dashboard_shared"
  | "system";

export interface CRMNotification {
  _id: ObjectId;
  userId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: "lead" | "website" | "user" | "dashboard_share";
  entityId?: ObjectId;
  websiteId?: ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}
