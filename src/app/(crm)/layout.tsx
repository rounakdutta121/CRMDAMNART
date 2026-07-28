import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "@/services/notifications.service";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [unreadCount, notifications] = await Promise.all([
    getUnreadNotificationCount(session.user),
    getNotificationsForUser(session.user, { limit: 8 }),
  ]);

  const bellNotifications = notifications.map((notification) => ({
    id: notification._id.toHexString(),
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    href:
      notification.entityType === "lead" && notification.entityId
        ? `/leads/${notification.entityId.toHexString()}`
        : notification.entityType === "user" && notification.entityId
          ? `/settings/users/${notification.entityId.toHexString()}`
          : "/notifications",
  }));

  return (
    <AppShell
      user={session.user}
      unreadCount={unreadCount}
      notifications={bellNotifications}
    >
      {children}
    </AppShell>
  );
}
