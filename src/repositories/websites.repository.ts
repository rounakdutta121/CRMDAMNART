import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { SafeWebsite, Website } from "@/types/website";
import { omitFields } from "@/lib/serialization";

export async function findWebsiteById(id: string): Promise<Website | null> {
  const db = await getDb();
  return db
    .collection<Website>(COLLECTIONS.websites)
    .findOne({ _id: new ObjectId(id) });
}

export async function findWebsiteByWebhookKey(
  webhookKey: string
): Promise<Website | null> {
  const db = await getDb();
  return db.collection<Website>(COLLECTIONS.websites).findOne({ webhookKey });
}

export async function findWebsiteByCode(code: string): Promise<Website | null> {
  const db = await getDb();
  return db.collection<Website>(COLLECTIONS.websites).findOne({ code });
}

export async function listWebsites(options?: {
  isActive?: boolean;
  ids?: string[];
}): Promise<SafeWebsite[]> {
  const db = await getDb();
  const filter: Filter<Website> = {};

  if (options?.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  if (options?.ids) {
    if (options.ids.length === 0) {
      return [];
    }
    filter._id = { $in: options.ids.map((id) => new ObjectId(id)) };
  }

  const websites = await db
    .collection<Website>(COLLECTIONS.websites)
    .find(filter)
    .sort({ name: 1 })
    .toArray();

  return websites.map((website) => omitFields(website, ["apiKeyHash"]));
}

export async function createWebsite(data: Omit<Website, "_id">): Promise<Website> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: Website = { ...data, _id };
  await db.collection<Website>(COLLECTIONS.websites).insertOne(doc);
  return doc;
}

export async function updateWebsite(
  id: string,
  update: Partial<Omit<Website, "_id" | "createdAt" | "webhookKey">>
): Promise<void> {
  const db = await getDb();
  await db.collection<Website>(COLLECTIONS.websites).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function regenerateWebsiteApiKey(
  id: string,
  apiKeyHash: string
): Promise<void> {
  const db = await getDb();
  await db.collection<Website>(COLLECTIONS.websites).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        apiKeyHash,
        updatedAt: new Date(),
      },
    }
  );
}

export function toSafeWebsite(website: Website): SafeWebsite {
  return omitFields(website, ["apiKeyHash"]);
}
