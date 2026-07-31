import { z } from "zod";
import { SOURCE_SYSTEMS } from "@/lib/constants";

export const webhookAttributionSchema = z
  .object({
    sessionId: z.string().trim().max(200).optional(),
    gclid: z.string().trim().max(500).optional(),
    gbraid: z.string().trim().max(500).optional(),
    wbraid: z.string().trim().max(500).optional(),
    msclkid: z.string().trim().max(500).optional(),
    fbclid: z.string().trim().max(500).optional(),
    utmSource: z.string().trim().max(200).optional(),
    utmMedium: z.string().trim().max(200).optional(),
    utmCampaign: z.string().trim().max(200).optional(),
    utmTerm: z.string().trim().max(200).optional(),
    utmContent: z.string().trim().max(200).optional(),
    landingPage: z.string().trim().max(2000).optional(),
    formPage: z.string().trim().max(2000).optional(),
    referrer: z.string().trim().max(2000).optional(),
    deviceType: z.string().trim().max(100).optional(),
    browser: z.string().trim().max(100).optional(),
  })
  .optional();

export const webhookMetadataSchema = z.object({
  sourceSystem: z.enum(SOURCE_SYSTEMS as [string, ...string[]]).default("website"),
  formCode: z.string().trim().max(40).optional(),
  formId: z.string().trim().max(40).optional(),
  formName: z.string().trim().max(200).optional(),
  externalSubmissionId: z.string().trim().max(200).optional(),
  isTestLead: z.boolean().optional(),
  serviceId: z.string().trim().max(40).optional(),
  serviceCode: z.string().trim().max(40).optional(),
  assignedUserId: z.string().trim().max(40).optional(),
});

export const webhookLeadSchema = webhookMetadataSchema
  .extend({
    name: z.string().trim().min(1, "Name is required.").max(200),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
    company: z.string().trim().max(200).optional().or(z.literal("")),
    country: z.string().trim().max(100).optional().or(z.literal("")),
    state: z.string().trim().max(100).optional().or(z.literal("")),
    city: z.string().trim().max(100).optional().or(z.literal("")),
    service: z.string().trim().max(200).optional().or(z.literal("")),
    message: z.string().trim().max(5000).optional().or(z.literal("")),
    consentStatus: z.enum(["granted", "denied", "unknown"]).optional(),
    privacyPolicyVersion: z.string().trim().max(50).optional(),
    currency: z.string().trim().length(3).optional(),
    attribution: webhookAttributionSchema,
  })
  .refine((data) => Boolean(data.email?.trim() || data.phone?.trim()), {
    message: "At least one of email or phone is required.",
    path: ["email"],
  });

export type WebhookLeadInput = z.infer<typeof webhookLeadSchema>;
