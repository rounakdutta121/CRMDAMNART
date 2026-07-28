import { cn } from "@/lib/utils";

export function RecordReference({
  value,
  label = "RECORD",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 font-mono-id text-xs text-[var(--ink)]",
        className
      )}
    >
      <span className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
        {label}
      </span>
      <span>{value}</span>
    </span>
  );
}

export function MetadataRow({
  items,
  className,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "flex flex-wrap gap-x-5 gap-y-2 border-y border-[var(--border)] py-2",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm text-[var(--ink)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ArchivePanel({
  children,
  className,
  ink = false,
}: {
  children: React.ReactNode;
  className?: string;
  ink?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border p-4 sm:p-5",
        ink
          ? "border-[var(--border-ink)] bg-[var(--surface-ink)] text-[var(--surface-ink-fg)]"
          : "border-[var(--border)] bg-[var(--surface-elevated)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MetricStrip({
  metrics,
  className,
}: {
  metrics: Array<{ label: string; value: React.ReactNode; href?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 border border-[var(--border-strong)] bg-[var(--surface-elevated)] sm:grid-cols-3 xl:grid-cols-5",
        className
      )}
    >
      {metrics.map((metric, index) => {
        const content = (
          <div className="px-4 py-3">
            <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
              {metric.label}
            </p>
            <p className="mt-1 font-editorial text-2xl font-semibold tabular-nums text-[var(--ink)]">
              {metric.value}
            </p>
          </div>
        );

        return (
          <div
            key={metric.label}
            className={cn(
              "border-[var(--border)]",
              index % 2 === 1 && "border-l",
              index >= 2 && "border-t sm:border-t-0 sm:border-l",
              index >= 3 && "xl:border-l"
            )}
          >
            {metric.href ? (
              <a
                href={metric.href}
                className="block transition-colors hover:bg-[var(--surface)] focus-visible:outline-none"
              >
                {content}
              </a>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReportSection({
  number,
  title,
  children,
  className,
}: {
  number?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="border-b border-[var(--border-strong)] pb-2">
        {number ? (
          <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
            {number}
          </p>
        ) : null}
        <h2 className="font-editorial text-xl font-semibold text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
