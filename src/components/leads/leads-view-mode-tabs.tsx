"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const MODES = [
  { key: "table", label: "Table" },
  { key: "monthly", label: "Grouped by month" },
] as const;

export function LeadsViewModeTabs({ currentMode }: { currentMode: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(mode: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("viewMode", mode);
    if (mode === "monthly") {
      params.delete("month");
      params.delete("page");
    }
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {MODES.map((mode) => {
        const active = currentMode === mode.key;
        return (
          <Link
            key={mode.key}
            href={hrefFor(mode.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-600 text-[var(--accent-fg)]"
                : "bg-[var(--surface-elevated)] text-[var(--ink-muted)] ring-1 ring-[var(--border)] hover:bg-[var(--surface)]"
            )}
          >
            {mode.label}
          </Link>
        );
      })}
    </div>
  );
}
