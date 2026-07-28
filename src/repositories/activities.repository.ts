import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { LeadActivity } from "@/types/activity";

export async function createActivity(
  data: Omit<LeadActivity, "_id">
): Promise<LeadActivity> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: LeadActivity = { ...data, _id };
  await db.collection<LeadActivity>(COLLECTIONS.leadActivities).insertOne(doc);
  return doc;
}

export async function listActivitiesByLeadId(
  leadId: string
): Promise<LeadActivity[]> {
  const db = await getDb();
  return db
    .collection<LeadActivity>(COLLECTIONS.leadActivities)
    .find({ leadId: new ObjectId(leadId) })
    .sort({ createdAt: -1 })
    .toArray();
}
