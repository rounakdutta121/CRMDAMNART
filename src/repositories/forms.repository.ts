import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { WebsiteForm } from "@/types/form";

export async function findFormById(id: string): Promise<WebsiteForm | null> {
  const db = await getDb();
  return db
    .collection<WebsiteForm>(COLLECTIONS.websiteForms)
    .findOne({ _id: new ObjectId(id) });
}

export async function findFormByCode(
  websiteId: string,
  code: string
): Promise<WebsiteForm | null> {
  const db = await getDb();
  return db.collection<WebsiteForm>(COLLECTIONS.websiteForms).findOne({
    websiteId: new ObjectId(websiteId),
    code,
  });
}

export async function findFormByName(
  websiteId: string,
  name: string
): Promise<WebsiteForm | null> {
  const db = await getDb();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return db.collection<WebsiteForm>(COLLECTIONS.websiteForms).findOne({
    websiteId: new ObjectId(websiteId),
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
    isActive: true,
  });
}

export async function listFormsByWebsite(
  websiteId: string,
  options?: { isActive?: boolean }
): Promise<WebsiteForm[]> {
  const db = await getDb();
  const filter: Filter<WebsiteForm> = {
    websiteId: new ObjectId(websiteId),
  };

  if (options?.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  return db
    .collection<WebsiteForm>(COLLECTIONS.websiteForms)
    .find(filter)
    .sort({ name: 1 })
    .toArray();
}

export async function createForm(
  data: Omit<WebsiteForm, "_id">
): Promise<WebsiteForm> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: WebsiteForm = { ...data, _id };
  await db.collection<WebsiteForm>(COLLECTIONS.websiteForms).insertOne(doc);
  return doc;
}

export async function updateForm(
  id: string,
  update: Partial<Omit<WebsiteForm, "_id" | "createdAt" | "websiteId">>
): Promise<void> {
  const db = await getDb();
  await db.collection<WebsiteForm>(COLLECTIONS.websiteForms).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function deleteForm(id: string): Promise<void> {
  const db = await getDb();
  const result = await db
    .collection<WebsiteForm>(COLLECTIONS.websiteForms)
    .deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount !== 1) {
    throw new Error("Form not found.");
  }
}

export async function findLegacyDefaultForm(
  websiteId: string
): Promise<WebsiteForm | null> {
  const db = await getDb();
  const forms = await db
    .collection<WebsiteForm>(COLLECTIONS.websiteForms)
    .find({
      websiteId: new ObjectId(websiteId),
      isActive: true,
    })
    .limit(2)
    .toArray();

  if (forms.length === 1) {
    return forms[0] ?? null;
  }

  return null;
}
