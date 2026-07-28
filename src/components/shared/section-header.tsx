import { cn } from "@/lib/utils";

export function SectionHeader({
  number,
  title,
  description,
  actions,
  className,
}: {
  number?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-2 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        {number ? (
          <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
            {number}
          </p>
        ) : null}
        <h2 className="font-editorial text-lg font-semibold text-[var(--ink)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
