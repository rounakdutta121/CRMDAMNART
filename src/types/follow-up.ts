import type { ObjectId } from "mongodb";

export type FollowUpStatus = "pending" | "completed" | "cancelled" | "overdue";

export type FollowUpMethod = "call" | "email" | "whatsapp" | "meeting" | "other";

export interface FollowUp {
  _id: ObjectId;
  leadId: ObjectId;
  contactId: ObjectId;
  websiteId: ObjectId;
  assignedUserId: ObjectId;
  method: FollowUpMethod;
  scheduledAt: Date;
  status: FollowUpStatus;
  note?: string;
  completedAt?: Date;
  createdByUserId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
