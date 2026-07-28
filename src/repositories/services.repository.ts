import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { CRMService } from "@/types/service";

export async function findServiceById(id: string): Promise<CRMService | null> {
  const db = await getDb();
  return db
    .collection<CRMService>(COLLECTIONS.services)
    .findOne({ _id: new ObjectId(id) });
}

export async function findServiceByCode(
  code: string
): Promise<CRMService | null> {
  const db = await getDb();
  return db.collection<CRMService>(COLLECTIONS.services).findOne({ code });
}

export async function listServices(options?: {
  isActive?: boolean;
}): Promise<CRMService[]> {
  const db = await getDb();
  const filter: Filter<CRMService> = {};

  if (options?.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  return db
    .collection<CRMService>(COLLECTIONS.services)
    .find(filter)
    .sort({ name: 1 })
    .toArray();
}

export async function listServicesForWebsite(
  websiteId: string,
  options?: { isActive?: boolean }
): Promise<CRMService[]> {
  const db = await getDb();
  const filter: Filter<CRMService> = {
    websiteIds: new ObjectId(websiteId),
  };

  if (options?.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  return db
    .collection<CRMService>(COLLECTIONS.services)
    .find(filter)
    .sort({ name: 1 })
    .toArray();
}

export async function createService(
  data: Omit<CRMService, "_id">
): Promise<CRMService> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: CRMService = { ...data, _id };
  await db.collection<CRMService>(COLLECTIONS.services).insertOne(doc);
  return doc;
}

export async function updateService(
  id: string,
  update: Partial<Omit<CRMService, "_id" | "createdAt" | "code">>
): Promise<void> {
  const db = await getDb();
  await db.collection<CRMService>(COLLECTIONS.services).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}
