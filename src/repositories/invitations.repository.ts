import { ObjectId, type Filter } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import { omitFields } from "@/lib/serialization";
import type {
  InvitationStatus,
  SafeUserInvitation,
  UserInvitation,
} from "@/types/invitation";

export async function findInvitationByTokenHash(
  tokenHash: string
): Promise<UserInvitation | null> {
  const db = await getDb();
  return db
    .collection<UserInvitation>(COLLECTIONS.userInvitations)
    .findOne({ tokenHash });
}

export async function findInvitationById(
  id: string
): Promise<UserInvitation | null> {
  const db = await getDb();
  return db
    .collection<UserInvitation>(COLLECTIONS.userInvitations)
    .findOne({ _id: new ObjectId(id) });
}

export async function findPendingInvitationByEmail(
  normalizedEmail: string
): Promise<UserInvitation | null> {
  const db = await getDb();
  return db.collection<UserInvitation>(COLLECTIONS.userInvitations).findOne({
    normalizedEmail,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
}

export async function listInvitations(options?: {
  status?: InvitationStatus;
}): Promise<SafeUserInvitation[]> {
  const db = await getDb();
  const filter: Filter<UserInvitation> = {};
  if (options?.status) {
    filter.status = options.status;
  }

  const invitations = await db
    .collection<UserInvitation>(COLLECTIONS.userInvitations)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return invitations.map((invitation) =>
    omitFields(invitation, ["tokenHash"])
  );
}

export async function createInvitation(
  data: Omit<UserInvitation, "_id">
): Promise<SafeUserInvitation> {
  const db = await getDb();
  const result = await db
    .collection<UserInvitation>(COLLECTIONS.userInvitations)
    .insertOne({
      ...data,
      _id: new ObjectId(),
    } as UserInvitation);

  const invitation = await findInvitationById(result.insertedId.toHexString());
  if (!invitation) {
    throw new Error("Failed to create invitation.");
  }
  return omitFields(invitation, ["tokenHash"]);
}

export async function updateInvitation(
  id: string,
  update: Partial<Omit<UserInvitation, "_id" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  await db.collection<UserInvitation>(COLLECTIONS.userInvitations).updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } }
  );
}

export async function revokePendingInvitationsForEmail(
  normalizedEmail: string,
  revokedByUserId: ObjectId
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection<UserInvitation>(COLLECTIONS.userInvitations).updateMany(
    { normalizedEmail, status: "pending" },
    {
      $set: {
        status: "revoked",
        revokedAt: now,
        revokedByUserId,
        updatedAt: now,
      },
    }
  );
}

export async function expireStaleInvitations(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const result = await db
    .collection<UserInvitation>(COLLECTIONS.userInvitations)
    .updateMany(
      { status: "pending", expiresAt: { $lte: now } },
      { $set: { status: "expired", updatedAt: now } }
    );
  return result.modifiedCount;
}
