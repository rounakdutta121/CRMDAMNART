import { z } from "zod";
import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  SOURCE_SYSTEMS,
} from "@/lib/constants";

export const createManualLeadSchema = z
  .object({
    websiteId: z.string().min(1, "Website is required."),
    name: z.string().trim().min(1, "Name is required.").max(200),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
    company: z.string().trim().max(200).optional().or(z.literal("")),
    country: z.string().trim().max(100).optional().or(z.literal("")),
    state: z.string().trim().max(100).optional().or(z.literal("")),
    city: z.string().trim().max(100).optional().or(z.literal("")),
    service: z.string().trim().min(1, "Service is required.").max(200),
    formName: z.string().trim().max(200).optional().or(z.literal("")),
    message: z.string().trim().max(5000).optional().or(z.literal("")),
    status: z.enum(LEAD_STATUSES as [string, ...string[]]),
    priority: z.enum(LEAD_PRIORITIES as [string, ...string[]]).default("normal"),
    currency: z.string().trim().length(3).default("INR"),
    assignedUserId: z.string().optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.email?.trim() || data.phone?.trim()), {
    message: "Provide at least an email or phone number.",
    path: ["email"],
  });

export const updateLeadSchema = z.object({
  service: z.string().trim().max(200).optional(),
  formName: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  priority: z.enum(LEAD_PRIORITIES as [string, ...string[]]).optional(),
  currency: z.string().trim().length(3).optional(),
  assignedUserId: z.string().optional().nullable(),
});

export const updateContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
});

export const leadFiltersSchema = z.object({
  search: z.string().optional(),
  websiteId: z.string().optional(),
  service: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  sourceSystem: z.enum(SOURCE_SYSTEMS as [string, ...string[]]).optional(),
  assignedUserId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hasGclid: z.enum(["true", "false"]).optional(),
  missingAttribution: z.enum(["true", "false"]).optional(),
});

export const createManualLeadFromFormSchema = z.object({
  websiteId: z.string().min(1, "Website is required."),
  formId: z.string().min(1, "Form is required."),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
  priority: z.enum(LEAD_PRIORITIES as [string, ...string[]]).default("normal"),
  assignedUserId: z.string().optional().or(z.literal("")),
  currency: z.string().trim().length(3).optional(),
});

export type CreateManualLeadInput = z.infer<typeof createManualLeadSchema>;
export type CreateManualLeadFromFormInput = z.infer<
  typeof createManualLeadFromFormSchema
>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
