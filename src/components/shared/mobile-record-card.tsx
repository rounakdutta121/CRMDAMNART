import Link from "next/link";
import { cn } from "@/lib/utils";

export function MobileRecordCard({
  href,
  title,
  subtitle,
  meta,
  status,
  className,
}: {
  href: string;
  title: string;
  subtitle?: string;
  meta: Array<{ label: string; value: React.ReactNode }>;
  status?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block border border-[var(--border)] bg-[var(--surface-elevated)] p-4 transition-colors hover:bg-[var(--surface)] focus-visible:outline-none",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono-id text-xs text-[var(--ink)]">{title}</p>
          {subtitle ? (
            <p className="mt-1 truncate text-sm font-medium text-[var(--ink)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {status}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {meta.map((item) => (
          <div key={item.label}>
            <dt className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
              {item.label}
            </dt>
            <dd className="mt-0.5 truncate text-sm text-[var(--ink-muted)]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
