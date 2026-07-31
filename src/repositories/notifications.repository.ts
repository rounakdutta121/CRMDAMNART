import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import { listUsers } from "@/repositories/users.repository";
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

export async function createNotificationsForUsers(
  userIds: ObjectId[],
  data: Omit<CRMNotification, "_id" | "userId">
): Promise<void> {
  const uniqueIds = [
    ...new Map(userIds.map((id) => [id.toHexString(), id])).values(),
  ];
  if (uniqueIds.length === 0) {
    return;
  }

  const db = await getDb();
  const now = data.createdAt ?? new Date();
  await db.collection<CRMNotification>(COLLECTIONS.notifications).insertMany(
    uniqueIds.map((userId) => ({
      ...data,
      _id: new ObjectId(),
      userId,
      createdAt: now,
    }))
  );
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
  actingUserId?: ObjectId;
}): Promise<void> {
  if (
    options.actingUserId &&
    options.userId.toHexString() === options.actingUserId.toHexString()
  ) {
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

export async function notifyNewLead(options: {
  leadId: ObjectId;
  websiteId: ObjectId;
  leadNumber: string;
  websiteName?: string;
  formName?: string;
  contactName?: string;
  sourceSystem?: string;
  assignedUserId?: ObjectId;
  excludeUserId?: ObjectId;
}): Promise<void> {
  const users = await listUsers({ isActive: true });
  const websiteIdHex = options.websiteId.toHexString();
  const recipientIds = users
    .filter((user) => {
      if (user.role === "viewer") {
        return false;
      }
      if (user.role === "super_admin" || user.role === "admin") {
        return true;
      }
      return user.permittedWebsiteIds.some(
        (id) => id.toHexString() === websiteIdHex
      );
    })
    .map((user) => user._id);

  if (options.assignedUserId) {
    recipientIds.push(options.assignedUserId);
  }

  const filtered = options.excludeUserId
    ? recipientIds.filter(
        (id) => id.toHexString() !== options.excludeUserId!.toHexString()
      )
    : recipientIds;

  const assignedHex = options.assignedUserId?.toHexString();
  const teamRecipients = assignedHex
    ? filtered.filter((id) => id.toHexString() !== assignedHex)
    : filtered;

  const who = options.contactName?.trim() || "a new contact";
  const where = options.websiteName?.trim() || "your website";
  const via = options.formName?.trim()
    ? ` via ${options.formName.trim()}`
    : options.sourceSystem
      ? ` via ${options.sourceSystem}`
      : "";

  await createNotificationsForUsers(teamRecipients, {
    type: "lead_created",
    title: "New lead received",
    message: `${options.leadNumber}: ${who} on ${where}${via}.`,
    entityType: "lead",
    entityId: options.leadId,
    websiteId: options.websiteId,
    isRead: false,
    createdAt: new Date(),
  });

  if (options.assignedUserId) {
    await notifyLeadAssignment({
      userId: options.assignedUserId,
      type: "lead_assigned",
      leadId: options.leadId,
      websiteId: options.websiteId,
      leadNumber: options.leadNumber,
    });
  }
}
