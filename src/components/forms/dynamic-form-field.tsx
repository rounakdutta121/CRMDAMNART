import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDefinition } from "@/types/form";

export function DynamicFormFieldInput({
  field,
  idPrefix = "",
}: {
  field: FormFieldDefinition;
  idPrefix?: string;
}) {
  const inputId = `${idPrefix}${field.incomingKey}`;

  if (field.fieldType === "textarea") {
    return (
      <Textarea
        id={inputId}
        name={field.incomingKey}
        required={field.required}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.fieldType === "select" && field.options?.length) {
    return (
      <select
        id={inputId}
        name={field.incomingKey}
        required={field.required}
        className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
        defaultValue=""
      >
        <option value="">Select…</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.fieldType === "boolean" || field.fieldType === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={field.incomingKey} value="true" />
        {field.label}
      </label>
    );
  }

  const inputType =
    field.fieldType === "email"
      ? "email"
      : field.fieldType === "number"
        ? "number"
        : field.fieldType === "date"
          ? "date"
          : field.fieldType === "datetime"
            ? "datetime-local"
            : field.fieldType === "url"
              ? "url"
              : field.fieldType === "phone"
                ? "tel"
                : "text";

  return (
    <Input
      id={inputId}
      name={field.incomingKey}
      type={inputType}
      required={field.required}
      placeholder={field.placeholder}
    />
  );
}

export function DynamicFormField({
  field,
  idPrefix = "",
}: {
  field: FormFieldDefinition;
  idPrefix?: string;
}) {
  if (field.fieldType === "boolean" || field.fieldType === "checkbox") {
    return <DynamicFormFieldInput field={field} idPrefix={idPrefix} />;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}${field.incomingKey}`}>
        {field.label}
        {field.required ? " *" : ""}
      </Label>
      {field.description ? (
        <p className="text-xs text-[var(--ink-muted)]">{field.description}</p>
      ) : null}
      <DynamicFormFieldInput field={field} idPrefix={idPrefix} />
    </div>
  );
}

export function getActiveSortedFields(
  fields: FormFieldDefinition[]
): FormFieldDefinition[] {
  return fields
    .filter((field) => field.active && field.canonicalTarget !== "ignore")
    .sort((a, b) => a.order - b.order);
}
