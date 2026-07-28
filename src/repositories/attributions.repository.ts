import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { LeadAttribution } from "@/types/attribution";

export async function createAttribution(
  data: Omit<LeadAttribution, "_id">
): Promise<LeadAttribution> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: LeadAttribution = { ...data, _id };
  await db.collection<LeadAttribution>(COLLECTIONS.leadAttributions).insertOne(doc);
  return doc;
}

export async function findAttributionByLeadId(
  leadId: string
): Promise<LeadAttribution | null> {
  const db = await getDb();
  return db.collection<LeadAttribution>(COLLECTIONS.leadAttributions).findOne({
    leadId: new ObjectId(leadId),
    touchType: "submission",
  });
}

export async function findLeadIdsWithGclid(
  websiteIds?: string[] | null
): Promise<ObjectId[]> {
  const db = await getDb();
  const match: Record<string, unknown> = {
    gclid: { $exists: true, $nin: [null, ""] },
  };

  if (websiteIds !== null && websiteIds !== undefined) {
    if (websiteIds.length === 0) {
      return [];
    }
    match.websiteId = { $in: websiteIds.map((id) => new ObjectId(id)) };
  }

  const docs = await db
    .collection<LeadAttribution>(COLLECTIONS.leadAttributions)
    .find(match, { projection: { leadId: 1 } })
    .toArray();

  return docs.map((doc) => doc.leadId);
}

export async function findLeadIdsWithAttribution(
  websiteIds?: string[] | null
): Promise<ObjectId[]> {
  const db = await getDb();
  const match: Record<string, unknown> = {};

  if (websiteIds !== null && websiteIds !== undefined) {
    if (websiteIds.length === 0) {
      return [];
    }
    match.websiteId = { $in: websiteIds.map((id) => new ObjectId(id)) };
  }

  const docs = await db
    .collection<LeadAttribution>(COLLECTIONS.leadAttributions)
    .find(match, { projection: { leadId: 1 } })
    .toArray();

  return docs.map((doc) => doc.leadId);
}
