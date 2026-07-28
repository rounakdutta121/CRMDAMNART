import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-sm)] border px-1.5 py-0.5 font-meta text-[0.625rem] font-medium",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border-ink)] bg-[var(--surface-ink)] text-[var(--surface-ink-fg)]",
        secondary:
          "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-muted)]",
        outline: "border-[var(--border-strong)] bg-transparent text-[var(--ink)]",
        success:
          "border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]",
        warning:
          "border-[var(--warning)] bg-[var(--warning-muted)] text-[var(--warning)]",
        danger:
          "border-[var(--danger)] bg-[var(--danger-muted)] text-[var(--danger)]",
        info: "border-[var(--info)] bg-[var(--info-muted)] text-[var(--info)]",
        active:
          "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
