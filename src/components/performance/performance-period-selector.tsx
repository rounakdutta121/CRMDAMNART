"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DASHBOARD_PERIOD_LABELS, DASHBOARD_PERIOD_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PerformancePeriodSelector({ current }: { current: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {DASHBOARD_PERIOD_PRESETS.filter((preset) => preset !== "custom").map((preset) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", preset);
        const active = current === preset;
        return (
          <Link
            key={preset}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "bg-[var(--surface-elevated)] text-[var(--ink-muted)] ring-1 ring-[var(--border)] hover:bg-[var(--surface)]"
            )}
          >
            {DASHBOARD_PERIOD_LABELS[preset]}
          </Link>
        );
      })}
    </div>
  );
}
