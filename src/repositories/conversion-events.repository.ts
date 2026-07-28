import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { ConversionEvent } from "@/types/conversion-event";

export async function createConversionEvent(
  data: Omit<ConversionEvent, "_id">
): Promise<ConversionEvent> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: ConversionEvent = { ...data, _id };
  await db
    .collection<ConversionEvent>(COLLECTIONS.conversionEvents)
    .insertOne(doc);
  return doc;
}

export async function findConversionEventsByLeadId(
  leadId: string
): Promise<ConversionEvent[]> {
  const db = await getDb();
  return db
    .collection<ConversionEvent>(COLLECTIONS.conversionEvents)
    .find({ leadId: new ObjectId(leadId) })
    .sort({ createdAt: -1 })
    .toArray();
}
