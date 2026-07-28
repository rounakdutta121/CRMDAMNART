"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "", label: "All" },
  { key: "my", label: "My leads" },
  { key: "unassigned", label: "Unassigned" },
  { key: "team", label: "Team" },
] as const;

export function LeadsViewTabs({ currentView }: { currentView: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (view) {
      params.set("view", view);
    } else {
      params.delete("view");
    }
    params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {VIEWS.map((view) => {
        const active = (currentView ?? "") === view.key;
        return (
          <Link
            key={view.key || "all"}
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
