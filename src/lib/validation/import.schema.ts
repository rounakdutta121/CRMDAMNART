import { z } from "zod";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/constants";

export const importColumnMappingSchema = z.object({
  websiteId: z.string().min(1),
  mappings: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(2000),
  defaultStatus: z
    .enum(LEAD_STATUSES as [string, ...string[]])
    .default("new"),
  defaultPriority: z
    .enum(LEAD_PRIORITIES as [string, ...string[]])
    .default("normal"),
});

export type ImportColumnMappingInput = z.infer<typeof importColumnMappingSchema>;

export const mergeContactsSchema = z.object({
  primaryContactId: z.string().min(1),
  secondaryContactId: z.string().min(1),
  preserveFrom: z.enum(["primary", "secondary"]).default("primary"),
});

export type MergeContactsInput = z.infer<typeof mergeContactsSchema>;

export const IMPORT_CANONICAL_FIELDS = [
  "name",
  "email",
  "phone",
  "whatsapp",
  "company",
  "country",
  "state",
  "city",
  "service",
  "message",
  "currency",
  "priority",
  "status",
] as const;
