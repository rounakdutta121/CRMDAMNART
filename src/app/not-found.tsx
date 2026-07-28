import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-[var(--ink)]">Page not found</h1>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        The page or record you requested does not exist or is not accessible.
      </p>
      <Button asChild className="mt-4">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
