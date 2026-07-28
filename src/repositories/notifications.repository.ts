import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import type { CRMNotification, NotificationType } from "@/types/notification";

export async function createNotification(
  data: Omit<CRMNotification, "_id">
): Promise<CRMNotification> {
  const db = await getDb();
  const notification: CRMNotification = {
    ...data,
    _id: new ObjectId(),
  };
  await db.collection<CRMNotification>(COLLECTIONS.notifications).insertOne(notification);
  return notification;
}

export async function listNotificationsForUser(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<CRMNotification[]> {
  const db = await getDb();
  const filter: Record<string, unknown> = {
    userId: new ObjectId(userId),
  };
  if (options?.unreadOnly) {
    filter.isRead = false;
  }

  return db
    .collection<CRMNotification>(COLLECTIONS.notifications)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(options?.limit ?? 50)
    .toArray();
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = await getDb();
  return db.collection<CRMNotification>(COLLECTIONS.notifications).countDocuments({
    userId: new ObjectId(userId),
    isRead: false,
  });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection<CRMNotification>(COLLECTIONS.notifications).updateOne(
    { _id: new ObjectId(notificationId), userId: new ObjectId(userId) },
    { $set: { isRead: true, readAt: now } }
  );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.collection<CRMNotification>(COLLECTIONS.notifications).updateMany(
    { userId: new ObjectId(userId), isRead: false },
    { $set: { isRead: true, readAt: now } }
  );
}

export async function notifyLeadAssignment(options: {
  userId: ObjectId;
  type: Extract<NotificationType, "lead_assigned" | "lead_reassigned" | "lead_unassigned">;
  leadId: ObjectId;
  websiteId: ObjectId;
  leadNumber: string;
  actingUserId: ObjectId;
}): Promise<void> {
  if (options.userId.toHexString() === options.actingUserId.toHexString()) {
    return;
  }

  const title =
    options.type === "lead_assigned"
      ? "Lead assigned to you"
      : options.type === "lead_reassigned"
        ? "Lead reassigned to you"
        : "Lead unassigned";

  await createNotification({
    userId: options.userId,
    type: options.type,
    title,
    message: `Lead ${options.leadNumber} has been updated.`,
    entityType: "lead",
    entityId: options.leadId,
    websiteId: options.websiteId,
    isRead: false,
    createdAt: new Date(),
  });
}
