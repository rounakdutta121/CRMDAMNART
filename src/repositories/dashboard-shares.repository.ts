import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import { omitFields } from "@/lib/serialization";
import type {
  DashboardShare,
  DashboardShareAccessLog,
  DashboardShareStatus,
  SafeDashboardShare,
} from "@/types/dashboard-share";

export async function findDashboardShareBySlug(
  shareSlug: string
): Promise<DashboardShare | null> {
  const db = await getDb();
  return db
    .collection<DashboardShare>(COLLECTIONS.dashboardShares)
    .findOne({ shareSlug });
}

export async function findDashboardShareById(
  id: string
): Promise<DashboardShare | null> {
  const db = await getDb();
  return db
    .collection<DashboardShare>(COLLECTIONS.dashboardShares)
    .findOne({ _id: new ObjectId(id) });
}

export async function listDashboardSharesForWebsite(
  websiteId: string
): Promise<SafeDashboardShare[]> {
  const db = await getDb();
  const shares = await db
    .collection<DashboardShare>(COLLECTIONS.dashboardShares)
    .find({ websiteId: new ObjectId(websiteId) })
    .sort({ createdAt: -1 })
    .toArray();

  return shares.map((share) => ({
    ...share,
    access: omitFields(share.access, ["passwordHash"]),
  }));
}

export async function createDashboardShare(
  data: Omit<DashboardShare, "_id">
): Promise<SafeDashboardShare> {
  const db = await getDb();
  const share: DashboardShare = { ...data, _id: new ObjectId() };
  await db.collection<DashboardShare>(COLLECTIONS.dashboardShares).insertOne(share);
  return {
    ...share,
    access: omitFields(share.access, ["passwordHash"]),
  };
}

export async function updateDashboardShare(
  id: string,
  update: Partial<Omit<DashboardShare, "_id" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  await db.collection<DashboardShare>(COLLECTIONS.dashboardShares).updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } }
  );
}

export async function incrementDashboardShareViewCount(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection<DashboardShare>(COLLECTIONS.dashboardShares).updateOne(
    { _id: new ObjectId(id) },
    { $inc: { viewCount: 1 }, $set: { lastViewedAt: now, updatedAt: now } }
  );
}

export async function createDashboardAccessLog(
  data: Omit<DashboardShareAccessLog, "_id">
): Promise<void> {
  const db = await getDb();
  await db
    .collection<DashboardShareAccessLog>(COLLECTIONS.dashboardShareAccessLogs)
    .insertOne({ ...data, _id: new ObjectId() });
}

export async function listDashboardAccessLogs(
  dashboardShareId: string,
  limit = 50
): Promise<DashboardShareAccessLog[]> {
  const db = await getDb();
  return db
    .collection<DashboardShareAccessLog>(COLLECTIONS.dashboardShareAccessLogs)
    .find({ dashboardShareId: new ObjectId(dashboardShareId) })
    .sort({ viewedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function recordPasswordAttempt(
  shareId: string
): Promise<number> {
  const db = await getDb();
  const key = `share:${shareId}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000);
  const collection = db.collection(COLLECTIONS.dashboardSharePasswordAttempts);

  await collection.updateOne(
    { key },
    {
      $push: {
        attempts: { $each: [now], $slice: -20 },
      },
      $setOnInsert: { key, createdAt: now },
    } as Record<string, unknown>,
    { upsert: true }
  );

  const doc = await collection.findOne({ key });
  const attempts = (doc?.attempts as Date[] | undefined) ?? [];
  return attempts.filter((attempt) => attempt >= windowStart).length;
}

export function toSafeDashboardShare(share: DashboardShare): SafeDashboardShare {
  return {
    ...share,
    access: omitFields(share.access, ["passwordHash"]),
  };
}

export function resolveShareStatus(share: DashboardShare): DashboardShareStatus {
  if (share.status === "revoked") {
    return "revoked";
  }
  if (share.access.expiresAt && share.access.expiresAt <= new Date()) {
    return "expired";
  }
  return share.status;
}
