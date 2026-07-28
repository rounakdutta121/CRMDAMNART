import type { CanonicalFieldTarget, LeadFormFieldValue } from "@/types/form";

function formatValue(value: LeadFormFieldValue["value"]): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

function maskValue(): string {
  return "••••••";
}

function targetLabel(target: CanonicalFieldTarget): string {
  if (target === "custom") {
    return "Custom";
  }
  if (target === "ignore") {
    return "Ignored";
  }
  return target;
}

export function LeadFormDataSection({
  formName,
  formCode,
  schemaVersion,
  fields,
  canViewSensitive,
}: {
  formName?: string;
  formCode?: string;
  schemaVersion?: number;
  fields: Array<{
    label: string;
    value: LeadFormFieldValue["value"];
    sensitive: boolean;
    showOnLeadDetail: boolean;
    order?: number;
    canonicalTarget?: CanonicalFieldTarget;
    incomingKey?: string;
  }>;
  canViewSensitive: boolean;
}) {
  const visible = fields
    .filter((field) => field.showOnLeadDetail)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (visible.length === 0 && !formName && !formCode) {
    return null;
  }

  return (
    <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold text-[var(--ink)]">
          Submitted form data
        </h3>
        {formName || formCode ? (
          <p className="text-xs text-[var(--ink-muted)]">
            {[formName, formCode ? `Code: ${formCode}` : null, schemaVersion ? `Schema v${schemaVersion}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">
          No configured form-field snapshots are available for this lead.
        </p>
      ) : (
        <dl className="space-y-2">
          {visible.map((field) => (
            <div
              key={`${field.incomingKey ?? field.label}-${field.order ?? 0}`}
              className="grid grid-cols-3 gap-2 text-sm"
            >
              <dt className="text-[var(--ink-muted)]">
                {field.label}
                {field.canonicalTarget && field.canonicalTarget !== "custom" ? (
                  <span className="mt-0.5 block text-[11px] text-[var(--ink-subtle)]">
                    {targetLabel(field.canonicalTarget)}
                  </span>
                ) : null}
              </dt>
              <dd className="col-span-2 break-words text-[var(--ink)]">
                {field.sensitive && !canViewSensitive
                  ? maskValue()
                  : formatValue(field.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
