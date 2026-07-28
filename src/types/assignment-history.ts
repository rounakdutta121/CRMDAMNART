import type { ObjectId } from "mongodb";

export interface LeadAssignmentHistory {
  _id: ObjectId;
  leadId: ObjectId;
  websiteId: ObjectId;
  previousUserId?: ObjectId;
  newUserId?: ObjectId;
  reason?: string;
  changedByUserId: ObjectId;
  createdAt: Date;
}
