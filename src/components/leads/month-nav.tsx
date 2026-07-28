"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonthNav({
  selectedYear,
  months,
}: {
  selectedYear: number;
  months: { month: number; monthKey: string; label: string; count: number }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(year: number, month?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    params.set("viewMode", month ? "list" : "monthly");
    if (month) {
      params.set("month", String(month));
    } else {
      params.delete("month");
    }
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-strong)] pb-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={hrefFor(selectedYear - 1)} aria-label="Previous year">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
              Archive year
            </p>
            <h2 className="font-editorial text-xl font-semibold text-[var(--ink)]">
              {selectedYear}
            </h2>
          </div>
          <Button asChild variant="outline" size="icon">
            <Link href={hrefFor(selectedYear + 1)} aria-label="Next year">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={hrefFor(selectedYear)}>Monthly overview</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => (
          <Link
            key={month.monthKey}
            href={hrefFor(selectedYear, month.month)}
            className="border border-[var(--border)] bg-[var(--surface-elevated)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)] sm:p-4"
          >
            <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
              {month.label.toUpperCase()}
            </p>
            <p className="mt-2 font-editorial text-2xl font-semibold tabular-nums text-[var(--ink)]">
              {month.count}
            </p>
            <p className="mt-1 font-meta text-[0.625rem] text-[var(--ink-muted)]">
              Lead records
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
