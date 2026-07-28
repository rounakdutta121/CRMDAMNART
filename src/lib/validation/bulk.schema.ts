import { z } from "zod";
import {
  FULFILMENT_STATUSES,
  LEAD_PRIORITIES,
  MAX_BULK_ACTION_SIZE,
  SALES_STATUSES,
} from "@/lib/constants";

export const bulkLeadActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    leadIds: z.array(z.string()).min(1).max(MAX_BULK_ACTION_SIZE),
    assignedUserId: z.string().nullable(),
  }),
  z.object({
    action: z.literal("change_status"),
    leadIds: z.array(z.string()).min(1).max(MAX_BULK_ACTION_SIZE),
    salesStatus: z.enum(SALES_STATUSES as [string, ...string[]]).optional(),
    fulfilmentStatus: z
      .enum(FULFILMENT_STATUSES as [string, ...string[]])
      .optional(),
  }),
  z.object({
    action: z.literal("change_priority"),
    leadIds: z.array(z.string()).min(1).max(MAX_BULK_ACTION_SIZE),
    priority: z.enum(LEAD_PRIORITIES as [string, ...string[]]),
  }),
  z.object({
    action: z.literal("mark_spam"),
    leadIds: z.array(z.string()).min(1).max(MAX_BULK_ACTION_SIZE),
  }),
]);

export type BulkLeadActionInput = z.infer<typeof bulkLeadActionSchema>;
