import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { SavedLeadView } from "@/types/saved-view";

export async function findSavedViewById(
  id: string,
  userId: string
): Promise<SavedLeadView | null> {
  const db = await getDb();
  return db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userId),
  });
}

export async function listSavedViewsByUser(
  userId: string
): Promise<SavedLeadView[]> {
  const db = await getDb();
  return db
    .collection<SavedLeadView>(COLLECTIONS.savedLeadViews)
    .find({ userId: new ObjectId(userId) })
    .sort({ name: 1 })
    .toArray();
}

export async function findDefaultSavedViewByUser(
  userId: string
): Promise<SavedLeadView | null> {
  const db = await getDb();
  return db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).findOne({
    userId: new ObjectId(userId),
    isDefault: true,
  });
}

export async function createSavedView(
  data: Omit<SavedLeadView, "_id">
): Promise<SavedLeadView> {
  const db = await getDb();

  if (data.isDefault) {
    await db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).updateMany(
      { userId: data.userId, isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );
  }

  const _id = new ObjectId();
  const doc: SavedLeadView = { ...data, _id };
  await db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).insertOne(doc);
  return doc;
}

export async function updateSavedView(
  id: string,
  userId: string,
  update: Partial<Omit<SavedLeadView, "_id" | "userId" | "createdAt">>
): Promise<void> {
  const db = await getDb();

  if (update.isDefault) {
    await db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).updateMany(
      {
        userId: new ObjectId(userId),
        isDefault: true,
        _id: { $ne: new ObjectId(id) },
      },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );
  }

  await db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).updateOne(
    {
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function deleteSavedView(
  id: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  await db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).deleteOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userId),
  });
}

export async function countSavedViewsByUser(
  userId: string,
  name?: string
): Promise<number> {
  const db = await getDb();
  const filter: Filter<SavedLeadView> = {
    userId: new ObjectId(userId),
  };

  if (name) {
    filter.name = name;
  }

  return db.collection<SavedLeadView>(COLLECTIONS.savedLeadViews).countDocuments(filter);
}
