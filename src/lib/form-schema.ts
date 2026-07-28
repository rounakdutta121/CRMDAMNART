import {
  MAX_ALIASES_PER_FIELD,
  MAX_FIELDS_PER_FORM,
  MAX_INCOMING_KEY_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_SELECT_OPTIONS,
} from "@/lib/constants";
import { createId } from "@/lib/id";
import { isSafeFieldKey } from "@/lib/safe-field-resolver";
import type {
  CanonicalFieldTarget,
  FormFieldDefinition,
  WebsiteForm,
} from "@/types/form";

const SINGLE_TARGET_FIELDS: CanonicalFieldTarget[] = [
  "contact.email",
  "contact.phone",
  "contact.name",
  "contact.whatsapp",
];

export interface SchemaValidationIssue {
  field?: string;
  message: string;
}

export function validateFormSchema(
  fields: FormFieldDefinition[]
): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = [];

  if (fields.length > MAX_FIELDS_PER_FORM) {
    issues.push({
      message: `A form may have at most ${MAX_FIELDS_PER_FORM} fields.`,
    });
  }

  const activeFields = fields.filter((f) => f.active);
  const incomingKeys = new Set<string>();
  const aliases = new Set<string>();
  const canonicalTargets = new Map<CanonicalFieldTarget, string>();

  for (const field of activeFields) {
    if (!field.incomingKey?.trim()) {
      issues.push({ field: field.id, message: "Incoming key is required." });
    } else if (!isSafeFieldKey(field.incomingKey)) {
      issues.push({ field: field.id, message: "Incoming key is not safe." });
    } else if (field.incomingKey.length > MAX_INCOMING_KEY_LENGTH) {
      issues.push({ field: field.id, message: "Incoming key is too long." });
    } else if (incomingKeys.has(field.incomingKey)) {
      issues.push({
        field: field.id,
        message: `Duplicate incoming key: ${field.incomingKey}`,
      });
    } else {
      incomingKeys.add(field.incomingKey);
    }

    if (field.label.length > MAX_LABEL_LENGTH) {
      issues.push({ field: field.id, message: "Label is too long." });
    }

    if (field.aliases.length > MAX_ALIASES_PER_FIELD) {
      issues.push({ field: field.id, message: "Too many aliases." });
    }

    for (const alias of field.aliases) {
      if (!isSafeFieldKey(alias)) {
        issues.push({ field: field.id, message: `Unsafe alias: ${alias}` });
      } else if (incomingKeys.has(alias) || aliases.has(alias)) {
        issues.push({ field: field.id, message: `Duplicate alias: ${alias}` });
      } else {
        aliases.add(alias);
      }
    }

    if (field.required && field.canonicalTarget === "ignore") {
      issues.push({
        field: field.id,
        message: "Required fields cannot be mapped to ignore.",
      });
    }

    if (
      field.fieldType === "select" &&
      (!field.options || field.options.length === 0)
    ) {
      issues.push({
        field: field.id,
        message: "Select fields require at least one option.",
      });
    }

    if (field.options && field.options.length > MAX_SELECT_OPTIONS) {
      issues.push({ field: field.id, message: "Too many select options." });
    }

    if (
      SINGLE_TARGET_FIELDS.includes(field.canonicalTarget) &&
      canonicalTargets.has(field.canonicalTarget)
    ) {
      issues.push({
        field: field.id,
        message: `Only one field may map to ${field.canonicalTarget}.`,
      });
    }

    if (field.canonicalTarget !== "custom" && field.canonicalTarget !== "ignore") {
      canonicalTargets.set(field.canonicalTarget, field.id);
    }

    if (field.sensitive && field.showOnLeadList) {
      issues.push({
        field: field.id,
        message: "Sensitive fields cannot appear on the lead list.",
      });
    }
  }

  return issues;
}

export function normalizeFormFieldDefinition(
  field: FormFieldDefinition
): FormFieldDefinition {
  const normalized: FormFieldDefinition = {
    id: field.id,
    incomingKey: field.incomingKey,
    aliases: Array.isArray(field.aliases) ? field.aliases : [],
    label: field.label,
    fieldType: field.fieldType,
    canonicalTarget: field.canonicalTarget,
    required: field.required ?? false,
    active: field.active ?? true,
    order: field.order ?? 0,
    trimValue: field.trimValue ?? true,
    normalizeValue: field.normalizeValue ?? false,
    showOnLeadDetail: field.showOnLeadDetail ?? true,
    showOnLeadList: field.showOnLeadList ?? false,
    searchable: field.searchable ?? false,
    sensitive: field.sensitive ?? false,
  };

  if (field.description != null && field.description !== "") {
    normalized.description = field.description;
  }

  if (field.placeholder != null && field.placeholder !== "") {
    normalized.placeholder = field.placeholder;
  }

  if (field.defaultValue != null) {
    normalized.defaultValue = field.defaultValue;
  }

  if (field.options != null && field.options.length > 0) {
    normalized.options = field.options;
  }

  if (field.validation != null) {
    const validation = {
      minimumLength: field.validation.minimumLength ?? undefined,
      maximumLength: field.validation.maximumLength ?? undefined,
      minimumValue: field.validation.minimumValue ?? undefined,
      maximumValue: field.validation.maximumValue ?? undefined,
      pattern: field.validation.pattern ?? undefined,
    };
    if (Object.values(validation).some((value) => value !== undefined)) {
      normalized.validation = validation;
    }
  }

  return normalized;
}

export function normalizeFormFieldDefinitions(
  fields: FormFieldDefinition[]
): FormFieldDefinition[] {
  return fields.map(normalizeFormFieldDefinition);
}

export function createFieldDefinition(
  partial: Partial<FormFieldDefinition> & {
    incomingKey: string;
    label: string;
    canonicalTarget: CanonicalFieldTarget;
  }
): FormFieldDefinition {
  return normalizeFormFieldDefinition({
    id: partial.id ?? createId(),
    incomingKey: partial.incomingKey,
    aliases: partial.aliases ?? [],
    label: partial.label,
    description: partial.description,
    fieldType: partial.fieldType ?? "text",
    canonicalTarget: partial.canonicalTarget,
    required: partial.required ?? false,
    active: partial.active ?? true,
    order: partial.order ?? 0,
    placeholder: partial.placeholder,
    defaultValue: partial.defaultValue,
    options: partial.options,
    validation: partial.validation,
    trimValue: partial.trimValue ?? true,
    normalizeValue: partial.normalizeValue ?? false,
    showOnLeadDetail: partial.showOnLeadDetail ?? true,
    showOnLeadList: partial.showOnLeadList ?? false,
    searchable: partial.searchable ?? false,
    sensitive: partial.sensitive ?? false,
  });
}

export function getActiveFields(form: WebsiteForm): FormFieldDefinition[] {
  return [...form.fields]
    .filter((f) => f.active)
    .sort((a, b) => a.order - b.order);
}

export function incrementSchemaVersion(form: WebsiteForm): number {
  return form.schemaVersion + 1;
}
