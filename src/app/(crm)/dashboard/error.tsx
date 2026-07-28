"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border border-red-200 bg-[var(--surface-elevated)] p-8 text-center">
      <h2 className="text-lg font-semibold text-[var(--ink)]">
        Unable to load dashboard
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
