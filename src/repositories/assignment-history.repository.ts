import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { LeadAssignmentHistory } from "@/types/assignment-history";

export async function createAssignmentHistory(
  data: Omit<LeadAssignmentHistory, "_id">
): Promise<LeadAssignmentHistory> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: LeadAssignmentHistory = { ...data, _id };
  await db
    .collection<LeadAssignmentHistory>(COLLECTIONS.leadAssignmentHistory)
    .insertOne(doc);
  return doc;
}

export async function listByLeadId(
  leadId: string
): Promise<LeadAssignmentHistory[]> {
  const db = await getDb();
  return db
    .collection<LeadAssignmentHistory>(COLLECTIONS.leadAssignmentHistory)
    .find({ leadId: new ObjectId(leadId) })
    .sort({ createdAt: -1 })
    .toArray();
}
