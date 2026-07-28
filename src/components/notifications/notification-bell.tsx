"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsReadAction } from "@/app/actions";

export interface NotificationBellItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  href?: string;
}

export function NotificationBell({
  unreadCount,
  notifications,
}: {
  unreadCount: number;
  notifications: NotificationBellItem[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-[var(--accent-fg)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="text-xs font-normal text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                Mark all read
              </button>
            </form>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-sm text-[var(--ink-muted)]">No notifications yet.</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link
                href={notification.href ?? "/notifications"}
                className={`flex flex-col items-start gap-0.5 ${
                  notification.isRead ? "opacity-70" : ""
                }`}
              >
                <span className="font-medium">{notification.title}</span>
                <span className="text-xs text-[var(--ink-muted)] line-clamp-2">
                  {notification.message}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
