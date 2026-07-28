"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#f4f1ea] p-6 text-[#1c1917]">
        <div className="max-w-md space-y-4 border border-[#9a9184] bg-[#faf8f4] p-6 text-center">
          <p className="text-[0.6875rem] uppercase tracking-[0.06em] text-[#7a7368]">
            System fault
          </p>
          <h1 className="font-serif text-2xl font-semibold">
            Something went wrong
          </h1>
          <p className="text-sm text-[#5c564c]">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-[#7a7368]">
              Reference: {error.digest}
            </p>
          ) : null}
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
