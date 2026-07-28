import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { canReceiveLeadForWebsite } from "@/lib/permissions";
import type { CRMUser, SafeCRMUser } from "@/types/auth";
import { omitFields } from "@/lib/serialization";

export async function findUserByNormalizedEmail(
  normalizedEmail: string
): Promise<CRMUser | null> {
  const db = await getDb();
  return db.collection<CRMUser>(COLLECTIONS.users).findOne({ normalizedEmail });
}

export async function findUserById(id: string): Promise<CRMUser | null> {
  const db = await getDb();
  return db
    .collection<CRMUser>(COLLECTIONS.users)
    .findOne({ _id: new ObjectId(id) });
}

export async function listUsers(options?: {
  isActive?: boolean;
}): Promise<SafeCRMUser[]> {
  const db = await getDb();
  const filter: Filter<CRMUser> = {};
  if (options?.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  const users = await db
    .collection<CRMUser>(COLLECTIONS.users)
    .find(filter)
    .sort({ name: 1 })
    .toArray();

  return users.map((user) => omitFields(user, ["passwordHash"]));
}

export async function listAssignableUsers(
  websiteIds?: string[]
): Promise<SafeCRMUser[]> {
  const db = await getDb();
  const filter: Filter<CRMUser> = {
    isActive: true,
    role: { $ne: "viewer" },
  };

  if (websiteIds && websiteIds.length > 0) {
    filter.$or = [
      { role: "super_admin" },
      {
        permittedWebsiteIds: {
          $in: websiteIds.map((id) => new ObjectId(id)),
        },
      },
    ];
  }

  const users = await db
    .collection<CRMUser>(COLLECTIONS.users)
    .find(filter)
    .sort({ name: 1 })
    .toArray();

  return users
    .filter((user) => {
      if (websiteIds && websiteIds.length > 0) {
        return websiteIds.some((websiteId) =>
          canReceiveLeadForWebsite(user, websiteId)
        );
      }

      if (user.role === "super_admin") {
        return canReceiveLeadForWebsite(user, new ObjectId());
      }

      return user.permittedWebsiteIds.some((websiteId) =>
        canReceiveLeadForWebsite(user, websiteId)
      );
    })
    .map((user) => omitFields(user, ["passwordHash"]));
}

export async function findUsersByWebsite(
  websiteId: string,
  options?: { isActive?: boolean }
): Promise<SafeCRMUser[]> {
  const db = await getDb();
  const filter: Filter<CRMUser> = {
    $or: [
      { role: "super_admin" },
      { permittedWebsiteIds: new ObjectId(websiteId) },
    ],
  };

  if (options?.isActive !== undefined) {
    filter.isActive = options.isActive;
  }

  const users = await db
    .collection<CRMUser>(COLLECTIONS.users)
    .find(filter)
    .sort({ name: 1 })
    .toArray();

  return users.map((user) => omitFields(user, ["passwordHash"]));
}

export async function incrementSessionVersion(id: string): Promise<number> {
  const db = await getDb();
  const result = await db
    .collection<CRMUser>(COLLECTIONS.users)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $inc: { sessionVersion: 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" }
    );

  return result?.sessionVersion ?? 1;
}

export async function createUser(
  data: Omit<CRMUser, "_id">
): Promise<SafeCRMUser> {
  const db = await getDb();
  const result = await db.collection<CRMUser>(COLLECTIONS.users).insertOne({
    ...data,
    sessionVersion: data.sessionVersion ?? 1,
    _id: new ObjectId(),
  } as CRMUser);

  const user = await findUserById(result.insertedId.toHexString());
  if (!user) {
    throw new Error("Failed to create user.");
  }
  return omitFields(user, ["passwordHash"]);
}

export async function updateUser(
  id: string,
  update: Partial<Omit<CRMUser, "_id" | "passwordHash" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  await db.collection<CRMUser>(COLLECTIONS.users).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function updateUserPassword(
  id: string,
  passwordHash: string
): Promise<void> {
  const db = await getDb();
  await db.collection<CRMUser>(COLLECTIONS.users).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        passwordHash,
        updatedAt: new Date(),
      },
      $inc: { sessionVersion: 1 },
    }
  );
}

export function toSafeUser(user: CRMUser): SafeCRMUser {
  return omitFields(user, ["passwordHash"]);
}
