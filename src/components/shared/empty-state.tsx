import { FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-10 sm:items-center sm:px-8 sm:py-14 sm:text-center",
        className
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center border border-[var(--border)] bg-[var(--surface-elevated)]">
        <FileText className="h-5 w-5 text-[var(--ink-subtle)]" aria-hidden />
      </div>
      <p className="font-meta text-[0.6875rem] text-[var(--ink-muted)]">No records</p>
      <h3 className="mt-2 font-editorial text-lg font-semibold text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Button asChild className="mt-5">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
