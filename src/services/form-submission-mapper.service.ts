import {
  LEAD_PRIORITIES,
  MAX_TEXT_VALUE_LENGTH,
  MAX_TEXTAREA_VALUE_LENGTH,
} from "@/lib/constants";
import { getActiveFields } from "@/lib/form-schema";
import {
  normalizeEmail,
  normalizeOptionalString,
  normalizePhone,
} from "@/lib/normalization";
import {
  collectPayloadFieldNames,
  flattenPayload,
  resolveFieldValue,
} from "@/lib/safe-field-resolver";
import type { LeadPriority } from "@/types/lead";
import type {
  ContactIdentityRule,
  FormFieldDefinition,
  LeadFormFieldValue,
  MappedFormSubmission,
  StoredFormValue,
  UnknownFieldPolicy,
  WebsiteForm,
} from "@/types/form";

export interface FormSubmissionValidationError {
  field: string;
  message: string;
}

export interface MapFormSubmissionOptions {
  unknownFieldPolicy?: UnknownFieldPolicy;
  contactIdentityRule?: ContactIdentityRule;
}

export class FormSubmissionMappingError extends Error {
  errors: FormSubmissionValidationError[];
  unknownFieldNames: string[];

  constructor(
    errors: FormSubmissionValidationError[],
    unknownFieldNames: string[] = []
  ) {
    super(
      errors.length > 0
        ? errors.map((error) => error.message).join(" ")
        : "Form submission validation failed."
    );
    this.name = "FormSubmissionMappingError";
    this.errors = errors;
    this.unknownFieldNames = unknownFieldNames;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/.+/i;

type ContactDataKey = keyof MappedFormSubmission["contactData"];
type LeadDataKey = keyof MappedFormSubmission["leadData"];
type AttributionDataKey = keyof MappedFormSubmission["attributionData"];

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

function resolveRawFieldValue(
  payload: Record<string, unknown>,
  field: FormFieldDefinition
): unknown {
  const resolved = resolveFieldValue(
    payload,
    field.incomingKey,
    field.aliases
  );

  if (!isEmptyValue(resolved)) {
    return resolved;
  }

  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  return undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string | number | boolean => item !== null && item !== undefined)
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "string") {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

function parseDateValue(value: string): Date | undefined {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return new Date(parsed);
}

function applyStringValidation(
  field: FormFieldDefinition,
  value: string,
  maxLength: number
): string | FormSubmissionValidationError {
  const processed = field.trimValue ? value.trim() : value;

  if (field.validation?.minimumLength !== undefined) {
    if (processed.length < field.validation.minimumLength) {
      return {
        field: field.incomingKey,
        message: `${field.label} must be at least ${field.validation.minimumLength} characters.`,
      };
    }
  }

  if (field.validation?.maximumLength !== undefined) {
    if (processed.length > field.validation.maximumLength) {
      return {
        field: field.incomingKey,
        message: `${field.label} must be at most ${field.validation.maximumLength} characters.`,
      };
    }
  }

  if (processed.length > maxLength) {
    return {
      field: field.incomingKey,
      message: `${field.label} exceeds the maximum allowed length.`,
    };
  }

  if (field.validation?.pattern) {
    try {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(processed)) {
        return {
          field: field.incomingKey,
          message: `${field.label} has an invalid format.`,
        };
      }
    } catch {
      return {
        field: field.incomingKey,
        message: `${field.label} has invalid validation configuration.`,
      };
    }
  }

  return processed;
}

function validateAndNormalizeFieldValue(
  field: FormFieldDefinition,
  rawValue: unknown
): { value?: StoredFormValue; error?: FormSubmissionValidationError } {
  const fieldType = field.fieldType;

  if (fieldType === "hidden") {
    if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean") {
      return { value: rawValue };
    }
    return { value: rawValue === undefined || rawValue === null ? null : String(rawValue) };
  }

  if (fieldType === "boolean" || fieldType === "checkbox") {
    const boolValue = coerceBoolean(rawValue);
    if (boolValue === undefined) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a boolean value.`,
        },
      };
    }
    return { value: boolValue };
  }

  if (fieldType === "number") {
    const numberValue = coerceNumber(rawValue);
    if (numberValue === undefined) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a number.`,
        },
      };
    }
    if (
      field.validation?.minimumValue !== undefined &&
      numberValue < field.validation.minimumValue
    ) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be at least ${field.validation.minimumValue}.`,
        },
      };
    }
    if (
      field.validation?.maximumValue !== undefined &&
      numberValue > field.validation.maximumValue
    ) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be at most ${field.validation.maximumValue}.`,
        },
      };
    }
    return { value: numberValue };
  }

  if (fieldType === "multi_select") {
    const arrayValue = coerceStringArray(rawValue);
    if (!arrayValue) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a list of values.`,
        },
      };
    }

    if (field.options && field.options.length > 0) {
      const allowed = new Set(field.options.map((option) => option.value));
      const invalid = arrayValue.filter((item) => !allowed.has(item));
      if (invalid.length > 0) {
        return {
          error: {
            field: field.incomingKey,
            message: `${field.label} contains invalid option values.`,
          },
        };
      }
    }

    return { value: arrayValue };
  }

  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return {
      error: {
        field: field.incomingKey,
        message: `${field.label} must be a text value.`,
      },
    };
  }

  const stringValue = String(rawValue);

  if (fieldType === "textarea") {
    const validated = applyStringValidation(
      field,
      stringValue,
      MAX_TEXTAREA_VALUE_LENGTH
    );
    if (typeof validated !== "string") {
      return { error: validated };
    }
    return { value: validated };
  }

  if (fieldType === "email") {
    const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
    if (typeof validated !== "string") {
      return { error: validated };
    }
    if (!EMAIL_PATTERN.test(validated)) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a valid email address.`,
        },
      };
    }
    return {
      value: field.normalizeValue ? normalizeEmail(validated) : validated,
    };
  }

  if (fieldType === "phone") {
    const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
    if (typeof validated !== "string") {
      return { error: validated };
    }
    const normalized = field.normalizeValue
      ? normalizePhone(validated)
      : validated.trim();
    if (normalized.replace(/\D/g, "").length < 7) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a valid phone number.`,
        },
      };
    }
    return { value: normalized };
  }

  if (fieldType === "url") {
    const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
    if (typeof validated !== "string") {
      return { error: validated };
    }
    if (!URL_PATTERN.test(validated)) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a valid URL.`,
        },
      };
    }
    return { value: validated };
  }

  if (fieldType === "date") {
    const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
    if (typeof validated !== "string") {
      return { error: validated };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validated) || !parseDateValue(validated)) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a valid date (YYYY-MM-DD).`,
        },
      };
    }
    return { value: validated };
  }

  if (fieldType === "datetime") {
    const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
    if (typeof validated !== "string") {
      return { error: validated };
    }
    if (!parseDateValue(validated)) {
      return {
        error: {
          field: field.incomingKey,
          message: `${field.label} must be a valid date and time.`,
        },
      };
    }
    return { value: validated };
  }

  if (fieldType === "select") {
    const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
    if (typeof validated !== "string") {
      return { error: validated };
    }
    if (field.options && field.options.length > 0) {
      const allowed = new Set(field.options.map((option) => option.value));
      if (!allowed.has(validated)) {
        return {
          error: {
            field: field.incomingKey,
            message: `${field.label} contains an invalid option value.`,
          },
        };
      }
    }
    return { value: validated };
  }

  const validated = applyStringValidation(field, stringValue, MAX_TEXT_VALUE_LENGTH);
  if (typeof validated !== "string") {
    return { error: validated };
  }
  return { value: validated };
}

function toLeadFormFieldValue(
  field: FormFieldDefinition,
  value: StoredFormValue
): LeadFormFieldValue {
  return {
    fieldDefinitionId: field.id,
    incomingKey: field.incomingKey,
    label: field.label,
    fieldType: field.fieldType,
    canonicalTarget: field.canonicalTarget,
    value,
    order: field.order,
    showOnLeadDetail: field.showOnLeadDetail,
    sensitive: field.sensitive,
  };
}

function setContactValue(
  contactData: MappedFormSubmission["contactData"],
  key: ContactDataKey,
  value: StoredFormValue
): void {
  if (typeof value !== "string" || value.length === 0) {
    return;
  }
  contactData[key] = value;
}

function setLeadValue(
  leadData: MappedFormSubmission["leadData"],
  key: LeadDataKey,
  value: StoredFormValue
): void {
  if (key === "leadValue") {
    if (typeof value === "number") {
      leadData.leadValue = value;
    }
    return;
  }

  if (key === "priority") {
    if (typeof value === "string" && LEAD_PRIORITIES.includes(value as LeadPriority)) {
      leadData.priority = value as LeadPriority;
    }
    return;
  }

  if (typeof value === "string" && value.length > 0) {
    if (key === "currency") {
      leadData.currency = value.toUpperCase();
      return;
    }
    leadData[key] = value;
  }
}

function setAttributionValue(
  attributionData: MappedFormSubmission["attributionData"],
  key: AttributionDataKey,
  value: StoredFormValue
): void {
  if (key === "submittedAt") {
    if (typeof value === "string") {
      const parsed = parseDateValue(value);
      if (parsed) {
        attributionData.submittedAt = parsed;
      }
    }
    return;
  }

  if (typeof value === "string" && value.length > 0) {
    attributionData[key] = value;
  }
}

function applyCanonicalMapping(
  field: FormFieldDefinition,
  value: StoredFormValue,
  result: {
    contactData: MappedFormSubmission["contactData"];
    leadData: MappedFormSubmission["leadData"];
    attributionData: MappedFormSubmission["attributionData"];
    customFieldValues: LeadFormFieldValue[];
    ignoredFieldNames: string[];
  }
): void {
  const target = field.canonicalTarget;

  if (target === "ignore") {
    result.ignoredFieldNames.push(field.incomingKey);
    return;
  }

  result.customFieldValues.push(toLeadFormFieldValue(field, value));

  if (target === "custom") {
    return;
  }

  if (target.startsWith("contact.")) {
    const key = target.slice("contact.".length) as ContactDataKey;
    setContactValue(result.contactData, key, value);
    return;
  }

  if (target.startsWith("lead.")) {
    const key = target.slice("lead.".length) as LeadDataKey;
    setLeadValue(result.leadData, key, value);
    return;
  }

  if (target.startsWith("attribution.")) {
    const key = target.slice("attribution.".length) as AttributionDataKey;
    setAttributionValue(result.attributionData, key, value);
  }
}

function combineContactName(
  contactData: MappedFormSubmission["contactData"]
): void {
  if (contactData.name?.trim()) {
    return;
  }

  const parts = [contactData.firstName, contactData.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (parts.length > 0) {
    contactData.name = parts.join(" ");
  }
}

function buildConfiguredFieldKeys(fields: FormFieldDefinition[]): Set<string> {
  const keys = new Set<string>();
  for (const field of fields) {
    keys.add(field.incomingKey);
    for (const alias of field.aliases) {
      keys.add(alias);
    }
  }
  return keys;
}

function detectUnknownFieldNames(
  payload: Record<string, unknown>,
  configuredKeys: Set<string>
): string[] {
  const payloadFieldNames = collectPayloadFieldNames(payload);
  const unknown = payloadFieldNames.filter((name) => !configuredKeys.has(name));
  return [...new Set(unknown)].sort();
}

function validateContactIdentityRule(
  contactData: MappedFormSubmission["contactData"],
  rule: ContactIdentityRule
): FormSubmissionValidationError | undefined {
  const email = normalizeOptionalString(contactData.email);
  const phone = normalizeOptionalString(contactData.phone);

  switch (rule) {
    case "email_or_phone":
      if (!email && !phone) {
        return {
          field: "contact",
          message: "At least one of email or phone is required.",
        };
      }
      return undefined;
    case "email_required":
      if (!email) {
        return {
          field: "contact.email",
          message: "Email is required.",
        };
      }
      return undefined;
    case "phone_required":
      if (!phone) {
        return {
          field: "contact.phone",
          message: "Phone is required.",
        };
      }
      return undefined;
    case "email_and_phone":
      if (!email || !phone) {
        return {
          field: "contact",
          message: "Both email and phone are required.",
        };
      }
      return undefined;
    case "none":
      return undefined;
    default: {
      const exhaustiveCheck: never = rule;
      return exhaustiveCheck;
    }
  }
}

export function mapFormSubmission(
  payload: Record<string, unknown>,
  form: WebsiteForm,
  options: MapFormSubmissionOptions = {}
): MappedFormSubmission {
  const unknownFieldPolicy =
    options.unknownFieldPolicy ?? form.unknownFieldPolicy;
  const contactIdentityRule =
    options.contactIdentityRule ?? form.contactIdentityRule;

  const flattenedPayload = flattenPayload(payload);
  const activeFields = getActiveFields(form);
  const configuredKeys = buildConfiguredFieldKeys(activeFields);
  const unknownFieldNames = detectUnknownFieldNames(
    flattenedPayload,
    configuredKeys
  );

  if (unknownFieldPolicy === "reject" && unknownFieldNames.length > 0) {
    throw new FormSubmissionMappingError(
      [
        {
          field: "_unknown",
          message: `Unknown fields are not allowed: ${unknownFieldNames.join(", ")}.`,
        },
      ],
      unknownFieldNames
    );
  }

  const errors: FormSubmissionValidationError[] = [];
  const contactData: MappedFormSubmission["contactData"] = {};
  const leadData: MappedFormSubmission["leadData"] = {};
  const attributionData: MappedFormSubmission["attributionData"] = {};
  const customFieldValues: LeadFormFieldValue[] = [];
  const ignoredFieldNames: string[] = [];

  for (const field of activeFields) {
    const rawValue = resolveRawFieldValue(flattenedPayload, field);

    if (isEmptyValue(rawValue)) {
      if (field.required) {
        errors.push({
          field: field.incomingKey,
          message: `${field.label} is required.`,
        });
      }
      continue;
    }

    const { value, error } = validateAndNormalizeFieldValue(field, rawValue);
    if (error) {
      errors.push(error);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    applyCanonicalMapping(field, value, {
      contactData,
      leadData,
      attributionData,
      customFieldValues,
      ignoredFieldNames,
    });
  }

  combineContactName(contactData);

  const identityError = validateContactIdentityRule(
    contactData,
    contactIdentityRule
  );
  if (identityError) {
    errors.push(identityError);
  }

  if (errors.length > 0) {
    throw new FormSubmissionMappingError(errors, unknownFieldNames);
  }

  return {
    contactData,
    leadData,
    attributionData,
    customFieldValues,
    ignoredFieldNames: [...new Set(ignoredFieldNames)].sort(),
    unknownFieldNames: [...new Set(unknownFieldNames)].sort(),
    schemaVersion: form.schemaVersion,
  };
}
