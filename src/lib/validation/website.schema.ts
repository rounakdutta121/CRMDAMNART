import { z } from "zod";

export const createWebsiteSchema = z.object({
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
  primaryDomain: z.string().trim().min(3, "Primary domain is required.").max(253),
  additionalDomains: z.array(z.string().trim().max(253)).default([]),
  brandName: z.string().trim().max(120).optional(),
  businessDivision: z.string().trim().max(120).optional(),
  defaultCurrency: z.string().trim().length(3).default("INR"),
  timezone: z.string().trim().min(1).default("Asia/Kolkata"),
  defaultLeadOwnerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateWebsiteSchema = createWebsiteSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateWebsiteInput = z.infer<typeof createWebsiteSchema>;
export type UpdateWebsiteInput = z.infer<typeof updateWebsiteSchema>;
