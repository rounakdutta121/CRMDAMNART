import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex flex-wrap items-center gap-1 font-meta text-[0.6875rem] text-[var(--ink-subtle)]"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRight className="h-3 w-3" aria-hidden />
          ) : null}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-[var(--ink)] focus-visible:outline-none"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--ink-muted)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
