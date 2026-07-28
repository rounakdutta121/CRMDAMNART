import { z } from "zod";

export const saveLeadViewSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  filters: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), z.boolean()])
  ),
  visibleColumns: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  viewMode: z.enum(["table", "monthly", "kanban"]).optional(),
  selectedYear: z.coerce.number().int().min(2000).max(2100).optional(),
  selectedMonth: z.coerce.number().int().min(1).max(12).optional(),
});

export type SaveLeadViewInput = z.infer<typeof saveLeadViewSchema>;
