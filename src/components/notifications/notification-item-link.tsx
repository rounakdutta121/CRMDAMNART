"use client";

import { useTransition } from "react";
import { openNotificationAction } from "@/app/actions";

export function NotificationItemLink({
  notificationId,
  href,
  children,
}: {
  notificationId: string;
  href: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="block w-full cursor-pointer text-left hover:opacity-90 disabled:opacity-60"
      onClick={() => {
        startTransition(async () => {
          await openNotificationAction(notificationId, href);
        });
      }}
    >
      {children}
    </button>
  );
}
