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

export async function findAttributionsByLeadIds(
  leadIds: string[]
): Promise<Pick<LeadAttribution, "leadId" | "gclid">[]> {
  if (leadIds.length === 0) {
    return [];
  }

  const db = await getDb();
  return db
    .collection<LeadAttribution>(COLLECTIONS.leadAttributions)
    .find(
      {
        leadId: { $in: leadIds.map((id) => new ObjectId(id)) },
        touchType: "submission",
      },
      { projection: { leadId: 1, gclid: 1 } }
    )
    .toArray();
}

export async function upsertLeadGclid(options: {
  leadId: ObjectId;
  contactId: ObjectId;
  websiteId: ObjectId;
  gclid: string | undefined;
}): Promise<void> {
  const db = await getDb();
  const collection = db.collection<LeadAttribution>(COLLECTIONS.leadAttributions);
  const filter = {
    leadId: options.leadId,
    touchType: "submission" as const,
  };

  const existing = await collection.findOne(filter);
  if (existing) {
    if (options.gclid) {
      await collection.updateOne(filter, { $set: { gclid: options.gclid } });
    } else {
      await collection.updateOne(filter, { $unset: { gclid: "" } });
    }
    return;
  }

  if (!options.gclid) {
    return;
  }

  await createAttribution({
    leadId: options.leadId,
    contactId: options.contactId,
    websiteId: options.websiteId,
    gclid: options.gclid,
    touchType: "submission",
    capturedAt: new Date(),
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
