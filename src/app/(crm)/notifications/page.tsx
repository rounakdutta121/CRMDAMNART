import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTimeIST } from "@/lib/datetime";
import { markAllNotificationsReadAction } from "@/app/actions";
import { requireSession } from "@/lib/auth";
import { getNotificationsForUser } from "@/services/notifications.service";

function notificationHref(notification: {
  entityType?: string;
  entityId?: { toHexString(): string };
}) {
  if (notification.entityType === "lead" && notification.entityId) {
    return `/leads/${notification.entityId.toHexString()}`;
  }
  if (notification.entityType === "user" && notification.entityId) {
    return `/settings/users/${notification.entityId.toHexString()}`;
  }
  return undefined;
}

export default async function NotificationsPage() {
  const user = await requireSession();
  const notifications = await getNotificationsForUser(user, { limit: 100 });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Notifications" }]} />
      <PageHeader
        title="Notifications"
        description="Internal CRM alerts for assignments, invitations and shares."
      />

      {notifications.some((n) => !n.isRead) ? (
        <form action={markAllNotificationsReadAction} className="mb-4">
          <Button type="submit" variant="outline" size="sm">
            Mark all as read
          </Button>
        </form>
      ) : null}

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <p className="border border-[var(--border)] bg-[var(--surface-elevated)] p-8 text-center text-sm text-[var(--ink-muted)]">
            No notifications yet.
          </p>
        ) : (
          notifications.map((notification) => {
            const href = notificationHref(notification);
            const content = (
              <div
                className={`border border-[var(--border)] bg-[var(--surface-elevated)] p-4 ${
                  notification.isRead ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--ink)]">{notification.title}</p>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">{notification.message}</p>
                  </div>
                  <p className="shrink-0 text-xs text-[var(--ink-muted)]">
                    {formatDateTimeIST(notification.createdAt)}
                  </p>
                </div>
              </div>
            );

            return href ? (
              <Link key={notification._id.toHexString()} href={href} className="block hover:opacity-90">
                {content}
              </Link>
            ) : (
              <div key={notification._id.toHexString()}>{content}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
