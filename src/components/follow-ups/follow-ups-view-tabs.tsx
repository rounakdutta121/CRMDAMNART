"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "my", label: "My" },
  { key: "due_today", label: "Due today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "team", label: "Team" },
] as const;

export function FollowUpsViewTabs({ currentView }: { currentView: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.delete("status");
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {VIEWS.map((view) => {
        const active = currentView === view.key;
        return (
          <Link
            key={view.key}
            href={hrefFor(view.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "bg-[var(--surface-elevated)] text-[var(--ink-muted)] ring-1 ring-[var(--border)] hover:bg-[var(--surface)]"
            )}
          >
            {view.label}
          </Link>
        );
      })}
    </div>
  );
}
