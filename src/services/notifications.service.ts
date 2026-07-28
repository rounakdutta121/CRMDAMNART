import { PermissionError } from "@/lib/permissions";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/repositories/notifications.repository";
import type { SessionUser } from "@/types/auth";
import type { CRMNotification } from "@/types/notification";

export async function getNotificationsForUser(
  user: SessionUser,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<CRMNotification[]> {
  return listNotificationsForUser(user.id, options);
}

export async function getUnreadNotificationCount(
  user: SessionUser
): Promise<number> {
  return countUnreadNotifications(user.id);
}

export async function markNotificationReadForUser(
  user: SessionUser,
  notificationId: string
): Promise<void> {
  await markNotificationRead(notificationId, user.id);
}

export async function markAllNotificationsReadForUser(
  user: SessionUser
): Promise<void> {
  await markAllNotificationsRead(user.id);
}

export async function requireNotificationOwnership(
  user: SessionUser,
  notification: CRMNotification | null
): Promise<void> {
  if (!notification) {
    throw new Error("Notification not found.");
  }
  if (notification.userId.toHexString() !== user.id) {
    throw new PermissionError("You do not have access to this notification.");
  }
}
