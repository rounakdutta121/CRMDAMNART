import { z } from "zod";
import { FORM_TEMPLATE_IDS } from "@/lib/form-templates";
import type {
  CanonicalFieldTarget,
  FormFieldType,
} from "@/types/form";

function nullishTrimmedString(max: number) {
  return z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().trim().max(max).optional()
  );
}

function nullishNumber() {
  return z.preprocess(
    (value) => (value === null ? undefined : value),
    z.number().optional()
  );
}

const formFieldOptionSchema = z.object({
  label: z.string().trim().min(1).max(150),
  value: z.string().trim().min(1).max(150),
});

const formFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  incomingKey: z.string().trim().min(1).max(100),
  aliases: z.array(z.string().trim().max(100)).default([]),
  label: z.string().trim().min(1).max(150),
  description: nullishTrimmedString(300),
  fieldType: z.string() as z.ZodType<FormFieldType>,
  canonicalTarget: z.string() as z.ZodType<CanonicalFieldTarget>,
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  order: z.number().int().nonnegative().default(0),
  placeholder: nullishTrimmedString(200),
  defaultValue: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.union([z.string(), z.number(), z.boolean()]).optional()
  ),
  options: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.array(formFieldOptionSchema).optional()
  ),
  validation: z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .object({
        minimumLength: z.preprocess(
          (v) => (v === null ? undefined : v),
          z.number().int().nonnegative().optional()
        ),
        maximumLength: z.preprocess(
          (v) => (v === null ? undefined : v),
          z.number().int().nonnegative().optional()
        ),
        minimumValue: nullishNumber(),
        maximumValue: nullishNumber(),
        pattern: z.preprocess(
          (v) => (v === null || v === "" ? undefined : v),
          z.string().optional()
        ),
      })
      .optional()
  ),
  trimValue: z.boolean().default(true),
  normalizeValue: z.boolean().default(false),
  showOnLeadDetail: z.boolean().default(true),
  showOnLeadList: z.boolean().default(false),
  searchable: z.boolean().default(false),
  sensitive: z.boolean().default(false),
});

export const createFormSchema = z.object({
  websiteId: z.string().min(1, "Website is required."),
  name: z.string().trim().min(2, "Name is required.").max(120),
  code: z
    .string()
    .trim()
    .min(2, "Code is required.")
    .max(40)
    .regex(
      /^[a-z0-9-_]+$/i,
      "Code may only contain letters, numbers, hyphens and underscores."
    ),
  description: z.string().trim().max(500).optional(),
  pageUrl: z.string().trim().max(2000).optional(),
  templateId: z.enum(FORM_TEMPLATE_IDS as [string, ...string[]]).default("basic_contact"),
  defaultServiceId: z.string().optional(),
  defaultLeadOwnerId: z.string().optional(),
  unknownFieldPolicy: z
    .enum(["ignore", "reject", "record_field_names"])
    .default("ignore"),
  contactIdentityRule: z
    .enum([
      "email_or_phone",
      "email_required",
      "phone_required",
      "email_and_phone",
      "none",
    ])
    .default("email_or_phone"),
  attributionEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updateFormSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: nullishTrimmedString(500),
  pageUrl: nullishTrimmedString(2000),
  defaultServiceId: z.string().optional().nullable(),
  defaultLeadOwnerId: z.string().optional().nullable(),
  fields: z.array(formFieldDefinitionSchema).optional(),
  unknownFieldPolicy: z
    .enum(["ignore", "reject", "record_field_names"])
    .optional(),
  contactIdentityRule: z
    .enum([
      "email_or_phone",
      "email_required",
      "phone_required",
      "email_and_phone",
      "none",
    ])
    .optional(),
  attributionEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const testFormSubmissionSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  validateOnly: z.boolean().default(false),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type UpdateFormInput = z.infer<typeof updateFormSchema>;
export type TestFormSubmissionInput = z.infer<typeof testFormSubmissionSchema>;
