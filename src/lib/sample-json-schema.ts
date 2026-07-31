import { createFieldDefinition } from "@/lib/form-schema";
import type {
  CanonicalFieldTarget,
  FormFieldDefinition,
  FormFieldType,
} from "@/types/form";

const SUGGESTED_MAPPING_PREFIX = "[Suggested mapping] ";

export class SampleJsonSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SampleJsonSchemaError";
  }
}

interface SuggestedMapping {
  fieldType: FormFieldType;
  canonicalTarget: CanonicalFieldTarget;
  label: string;
  aliases: string[];
}

const KEY_MAPPING_RULES: Array<{
  pattern: RegExp;
  mapping: SuggestedMapping;
}> = [
  {
    pattern: /^(fullName|full_name|name)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.name",
      label: "Name",
      aliases: [],
    },
  },
  {
    pattern: /^(fname|firstName|first_name)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.firstName",
      label: "First Name",
      aliases: [],
    },
  },
  {
    pattern: /^(lname|lastName|last_name)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.lastName",
      label: "Last Name",
      aliases: [],
    },
  },
  {
    pattern: /^(email|workEmail|work_email)$/i,
    mapping: {
      fieldType: "email",
      canonicalTarget: "contact.email",
      label: "Email",
      aliases: [],
    },
  },
  {
    pattern: /^(phone|mobile|phoneNum|Phone-Number)$/i,
    mapping: {
      fieldType: "phone",
      canonicalTarget: "contact.phone",
      label: "Phone",
      aliases: [],
    },
  },
  {
    pattern: /^(whatsapp)$/i,
    mapping: {
      fieldType: "phone",
      canonicalTarget: "contact.whatsapp",
      label: "WhatsApp",
      aliases: [],
    },
  },
  {
    pattern: /^(company)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.company",
      label: "Company",
      aliases: [],
    },
  },
  {
    pattern: /^(country)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.country",
      label: "Country",
      aliases: [],
    },
  },
  {
    pattern: /^(state|region)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.state",
      label: "State",
      aliases: [],
    },
  },
  {
    pattern: /^(city|location)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "contact.city",
      label: "City",
      aliases: [],
    },
  },
  {
    pattern: /^(message|query|details|reqText|msg|help_message)$/i,
    mapping: {
      fieldType: "textarea",
      canonicalTarget: "lead.message",
      label: "Message",
      aliases: [],
    },
  },
  {
    pattern: /^(service|services|inquiryType|course|program|requirement|requirements|selectedPlan|book)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "lead.service",
      label: "Service",
      aliases: [],
    },
  },
  {
    pattern: /^(currency)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "lead.currency",
      label: "Currency",
      aliases: [],
    },
  },
  {
    pattern: /^(priority)$/i,
    mapping: {
      fieldType: "select",
      canonicalTarget: "lead.priority",
      label: "Priority",
      aliases: [],
    },
  },
  {
    pattern: /^(gclid)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.gclid",
      label: "GCLID",
      aliases: [],
    },
  },
  {
    pattern: /^(gbraid)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.gbraid",
      label: "GBRAID",
      aliases: [],
    },
  },
  {
    pattern: /^(wbraid)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.wbraid",
      label: "WBRAID",
      aliases: [],
    },
  },
  {
    pattern: /^(msclkid)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.msclkid",
      label: "MSCLKID",
      aliases: [],
    },
  },
  {
    pattern: /^(fbclid)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.fbclid",
      label: "FBCLID",
      aliases: [],
    },
  },
  {
    pattern: /^(utm_source|utmSource)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.utmSource",
      label: "UTM Source",
      aliases: [],
    },
  },
  {
    pattern: /^(utm_medium|utmMedium)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.utmMedium",
      label: "UTM Medium",
      aliases: [],
    },
  },
  {
    pattern: /^(utm_campaign|utmCampaign)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.utmCampaign",
      label: "UTM Campaign",
      aliases: [],
    },
  },
  {
    pattern: /^(utm_term|utmTerm)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.utmTerm",
      label: "UTM Term",
      aliases: [],
    },
  },
  {
    pattern: /^(utm_content|utmContent)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.utmContent",
      label: "UTM Content",
      aliases: [],
    },
  },
  {
    pattern: /^(sessionId|session_id)$/i,
    mapping: {
      fieldType: "text",
      canonicalTarget: "attribution.sessionId",
      label: "Session ID",
      aliases: [],
    },
  },
  {
    pattern: /^(landingPage|landing_page)$/i,
    mapping: {
      fieldType: "url",
      canonicalTarget: "attribution.landingPage",
      label: "Landing Page",
      aliases: [],
    },
  },
  {
    pattern: /^(formPage|form_page)$/i,
    mapping: {
      fieldType: "url",
      canonicalTarget: "attribution.formPage",
      label: "Form Page",
      aliases: [],
    },
  },
  {
    pattern: /^(pageUrl|page_url)$/i,
    mapping: {
      fieldType: "url",
      canonicalTarget: "attribution.pageUrl",
      label: "Page URL",
      aliases: [],
    },
  },
  {
    pattern: /^(referrer)$/i,
    mapping: {
      fieldType: "url",
      canonicalTarget: "attribution.referrer",
      label: "Referrer",
      aliases: [],
    },
  },
  {
    pattern: /^(submittedAt|timestamp)$/i,
    mapping: {
      fieldType: "datetime",
      canonicalTarget: "attribution.submittedAt",
      label: "Submitted At",
      aliases: [],
    },
  },
];

const ATTRIBUTION_KEY_PREFIX = /^attribution\./i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function humanizeKey(key: string): string {
  const base = key.replace(/^attribution\./i, "");
  return base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhoneLike(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isUrlLike(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isDateLike(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function isDateTimeLike(value: string): boolean {
  if (!isDateLike(value)) {
    return false;
  }
  return /[T\s]\d{2}:\d{2}/.test(value);
}

function inferFieldTypeFromValue(value: unknown): FormFieldType {
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return "number";
  }
  if (Array.isArray(value)) {
    return "multi_select";
  }
  if (typeof value === "string") {
    if (isEmailLike(value)) {
      return "email";
    }
    if (isPhoneLike(value)) {
      return "phone";
    }
    if (isUrlLike(value)) {
      return "url";
    }
    if (isDateTimeLike(value)) {
      return "datetime";
    }
    if (isDateLike(value)) {
      return "date";
    }
    if (value.length > 500) {
      return "textarea";
    }
    return "text";
  }
  return "text";
}

function suggestMapping(
  key: string,
  value: unknown
): SuggestedMapping {
  const normalizedKey = key.replace(ATTRIBUTION_KEY_PREFIX, "");
  const lookupKey = ATTRIBUTION_KEY_PREFIX.test(key)
    ? `attribution.${normalizedKey}`
    : key;

  for (const rule of KEY_MAPPING_RULES) {
    if (rule.pattern.test(lookupKey) || rule.pattern.test(normalizedKey)) {
      return rule.mapping;
    }
  }

  const inferredType = inferFieldTypeFromValue(value);
  return {
    fieldType: inferredType,
    canonicalTarget: "custom",
    label: humanizeKey(key),
    aliases: [],
  };
}

function flattenSampleObject(
  obj: Record<string, unknown>,
  prefix = ""
): Array<{ key: string; value: unknown }> {
  const entries: Array<{ key: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      key === "attribution" &&
      isPlainObject(value) &&
      !prefix
    ) {
      for (const [attrKey, attrValue] of Object.entries(value)) {
        entries.push({
          key: `attribution.${attrKey}`,
          value: attrValue,
        });
        if (!(attrKey in obj)) {
          entries.push({ key: attrKey, value: attrValue });
        }
      }
      continue;
    }

    if (isPlainObject(value)) {
      entries.push(...flattenSampleObject(value, fullKey));
      continue;
    }

    if (Array.isArray(value)) {
      entries.push({ key: fullKey, value });
      continue;
    }

    entries.push({ key: fullKey, value });
  }

  return entries;
}

function buildSuggestedDescription(
  canonicalTarget: CanonicalFieldTarget
): string {
  if (canonicalTarget === "custom") {
    return `${SUGGESTED_MAPPING_PREFIX}No confident CRM mapping found. Review and assign a destination.`;
  }
  return `${SUGGESTED_MAPPING_PREFIX}Suggested destination: ${canonicalTarget}. Review before saving.`;
}

export function inferFieldsFromSampleJson(json: unknown): FormFieldDefinition[] {
  if (json === null || json === undefined) {
    throw new SampleJsonSchemaError("Sample JSON must be a non-null object.");
  }

  if (Array.isArray(json)) {
    throw new SampleJsonSchemaError(
      "Sample JSON root must be an object, not an array."
    );
  }

  if (!isPlainObject(json)) {
    throw new SampleJsonSchemaError("Sample JSON must be a plain object.");
  }

  const flattened = flattenSampleObject(json);
  const seenKeys = new Set<string>();
  const fields: FormFieldDefinition[] = [];

  flattened.forEach(({ key, value }, index) => {
    if (seenKeys.has(key)) {
      return;
    }
    seenKeys.add(key);

    const suggestion = suggestMapping(key, value);
    const normalizeValue =
      suggestion.fieldType === "email" || suggestion.fieldType === "phone";

    fields.push(
      createFieldDefinition({
        incomingKey: key,
        aliases: suggestion.aliases,
        label: suggestion.label,
        description: buildSuggestedDescription(suggestion.canonicalTarget),
        fieldType: suggestion.fieldType,
        canonicalTarget: suggestion.canonicalTarget,
        required: false,
        active: true,
        order: index + 1,
        normalizeValue,
        options:
          suggestion.fieldType === "select" && suggestion.canonicalTarget === "lead.priority"
            ? [
                { label: "Low", value: "low" },
                { label: "Normal", value: "normal" },
                { label: "High", value: "high" },
                { label: "Urgent", value: "urgent" },
              ]
            : undefined,
      })
    );
  });

  return fields;
}

export function parseSampleJsonString(input: string): FormFieldDefinition[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new SampleJsonSchemaError("Invalid JSON. Please check the syntax.");
  }
  return inferFieldsFromSampleJson(parsed);
}
