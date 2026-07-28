import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { FollowUp } from "@/types/follow-up";

export async function createFollowUp(
  data: Omit<FollowUp, "_id">
): Promise<FollowUp> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: FollowUp = { ...data, _id };
  await db.collection<FollowUp>(COLLECTIONS.followUps).insertOne(doc);
  return doc;
}

export async function findFollowUpById(id: string): Promise<FollowUp | null> {
  const db = await getDb();
  return db
    .collection<FollowUp>(COLLECTIONS.followUps)
    .findOne({ _id: new ObjectId(id) });
}

export async function updateFollowUp(
  id: string,
  update: Partial<Omit<FollowUp, "_id" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  await db.collection<FollowUp>(COLLECTIONS.followUps).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function listFollowUps(options: {
  websiteIds?: string[] | null;
  assignedUserId?: string;
  status?: string;
  view?: string;
  skip: number;
  limit: number;
}): Promise<{ items: FollowUp[]; total: number }> {
  const db = await getDb();
  const filter: Filter<FollowUp> = {};

  if (options.websiteIds !== null && options.websiteIds !== undefined) {
    if (options.websiteIds.length === 0) {
      return { items: [], total: 0 };
    }
    filter.websiteId = {
      $in: options.websiteIds.map((id) => new ObjectId(id)),
    };
  }

  if (options.assignedUserId) {
    filter.assignedUserId = new ObjectId(options.assignedUserId);
  }

  const view = options.view;
  const status = options.status;

  if (view === "due_today" || status === "due_today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    filter.status = "pending";
    filter.scheduledAt = { $gte: start, $lte: end };
  } else if (view === "upcoming" || status === "upcoming") {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    filter.status = "pending";
    filter.scheduledAt = { $gt: end };
  } else if (status === "overdue" || view === "overdue") {
    filter.status = "pending";
    filter.scheduledAt = { $lt: new Date() };
  } else if (status && status !== "overdue") {
    filter.status = status as FollowUp["status"];
  }

  const [items, total] = await Promise.all([
    db
      .collection<FollowUp>(COLLECTIONS.followUps)
      .find(filter)
      .sort({ scheduledAt: 1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db.collection<FollowUp>(COLLECTIONS.followUps).countDocuments(filter),
  ]);

  return { items, total };
}

export async function getUpcomingFollowUps(
  websiteIds: string[] | null,
  limit = 5
): Promise<FollowUp[]> {
  const db = await getDb();
  const filter: Filter<FollowUp> = {
    status: "pending",
    scheduledAt: { $gte: new Date() },
  };

  if (websiteIds !== null) {
    if (websiteIds.length === 0) {
      return [];
    }
    filter.websiteId = { $in: websiteIds.map((id) => new ObjectId(id)) };
  }

  return db
    .collection<FollowUp>(COLLECTIONS.followUps)
    .find(filter)
    .sort({ scheduledAt: 1 })
    .limit(limit)
    .toArray();
}

export async function countFollowUpsDueToday(
  websiteIds: string[] | null
): Promise<number> {
  const db = await getDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const filter: Filter<FollowUp> = {
    status: "pending",
    scheduledAt: { $gte: start, $lte: end },
  };

  if (websiteIds !== null) {
    if (websiteIds.length === 0) {
      return 0;
    }
    filter.websiteId = { $in: websiteIds.map((id) => new ObjectId(id)) };
  }

  return db.collection<FollowUp>(COLLECTIONS.followUps).countDocuments(filter);
}

export async function countOverdueFollowUps(
  websiteIds: string[] | null
): Promise<number> {
  const db = await getDb();
  const filter: Filter<FollowUp> = {
    status: "pending",
    scheduledAt: { $lt: new Date() },
  };

  if (websiteIds !== null) {
    if (websiteIds.length === 0) {
      return 0;
    }
    filter.websiteId = { $in: websiteIds.map((id) => new ObjectId(id)) };
  }

  return db.collection<FollowUp>(COLLECTIONS.followUps).countDocuments(filter);
}

export function withDynamicStatus(followUp: FollowUp): FollowUp {
  if (
    followUp.status === "pending" &&
    followUp.scheduledAt.getTime() < Date.now()
  ) {
    return { ...followUp, status: "overdue" };
  }
  return followUp;
}
