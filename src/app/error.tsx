"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center gap-4 border border-[var(--border)] bg-[var(--surface)] p-6 sm:items-center sm:text-center">
      <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
        Record could not be loaded
      </p>
      <h2 className="font-editorial text-xl font-semibold text-[var(--ink)]">
        Unable to load this page
      </h2>
      <p className="max-w-md text-sm text-[var(--ink-muted)]">
        An unexpected error occurred while loading this page. The requested
        record may be unavailable or you may not have permission to access it.
      </p>
      {error.digest ? (
        <p className="font-mono-id text-xs text-[var(--ink-subtle)]">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
