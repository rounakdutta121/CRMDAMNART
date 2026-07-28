import { z } from "zod";

export const createServiceSchema = z.object({
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
  category: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  websiteIds: z.array(z.string()).min(1, "Select at least one website."),
  defaultLeadValue: z.coerce.number().nonnegative().optional(),
  defaultCurrency: z.string().trim().length(3).default("INR"),
  defaultLeadOwnerId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema
  .omit({ code: true })
  .partial()
  .extend({
    websiteIds: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
