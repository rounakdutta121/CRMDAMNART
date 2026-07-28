import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";

export interface IdempotencyRecord {
  _id: ObjectId;
  websiteId: ObjectId;
  idempotencyKey: string;
  leadId: ObjectId;
  contactId: ObjectId;
  leadNumber: string;
  createdAt: Date;
}

export async function findIdempotencyRecord(
  websiteId: string,
  idempotencyKey: string
): Promise<IdempotencyRecord | null> {
  const db = await getDb();
  return db.collection<IdempotencyRecord>(COLLECTIONS.webhookIdempotency).findOne({
    websiteId: new ObjectId(websiteId),
    idempotencyKey,
  });
}

export async function createIdempotencyRecord(
  data: Omit<IdempotencyRecord, "_id">
): Promise<void> {
  const db = await getDb();
  await db.collection<IdempotencyRecord>(COLLECTIONS.webhookIdempotency).insertOne({
    ...data,
    _id: new ObjectId(),
  });
}
