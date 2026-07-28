import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  reference,
  period,
  actionLabel,
  actionHref,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  reference?: string;
  period?: string;
  actionLabel?: string;
  actionHref?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-[var(--border-strong)] pb-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow || period ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {eyebrow ? (
                <p className="font-meta text-[0.6875rem] text-[var(--ink-muted)]">
                  {eyebrow}
                </p>
              ) : null}
              {period ? (
                <p className="font-meta text-[0.6875rem] text-[var(--ochre)]">
                  {period}
                </p>
              ) : null}
            </div>
          ) : null}
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
              {description}
            </p>
          ) : null}
          {reference ? (
            <p className="font-mono-id text-xs text-[var(--ink-subtle)]">
              RECORD · {reference}
            </p>
          ) : null}
        </div>

        {(actions || (actionLabel && actionHref)) && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {actions}
            {actionLabel && actionHref ? (
              <Button asChild>
                <Link href={actionHref}>{actionLabel}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
