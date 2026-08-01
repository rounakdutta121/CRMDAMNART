import { z } from "zod";
import { DASHBOARD_PERIOD_PRESETS } from "@/lib/constants";

export const PERFORMANCE_METRICS = [
  "total_leads",
  "new_leads",
  "qualified_leads",
  "converted_leads",
  "conversion_rate",
  "unassigned_leads",
  "gclid_capture_rate",
] as const;

export const PERFORMANCE_CHARTS = [
  "leads_over_time",
  "by_status",
  "by_source",
] as const;

export const PERFORMANCE_TABLES = [
  "by_status",
  "by_source",
  "lead_details",
] as const;

export const createDashboardShareSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  title: z.string().trim().min(2, "Title is required.").max(160),
  periodPreset: z.enum(
    DASHBOARD_PERIOD_PRESETS as unknown as [string, ...string[]]
  ),
  customStartDate: z.string().optional(),
  customEndDate: z.string().optional(),
  visibleMetrics: z.array(z.string()).default([...PERFORMANCE_METRICS]),
  visibleCharts: z.array(z.string()).default([...PERFORMANCE_CHARTS]),
  visibleTables: z.array(z.string()).default([...PERFORMANCE_TABLES]),
  branding: z.object({
    logoUrl: z.string().url().optional().or(z.literal("")),
    displayName: z.string().trim().min(1).max(120),
    primaryColor: z.string().trim().max(20).optional(),
    accentColor: z.string().trim().max(20).optional(),
    footerText: z.string().trim().max(300).optional(),
    showDamnArtBranding: z.boolean().default(true),
  }),
  access: z.object({
    passwordProtected: z.boolean().default(false),
    password: z.string().min(8).max(128).optional(),
    expiresAt: z.string().optional(),
    allowCsvDownload: z.boolean().default(false),
  }),
});

export const updateDashboardShareSchema = createDashboardShareSchema
  .partial()
  .extend({
    status: z.enum(["active", "revoked"]).optional(),
  });

export const verifyDashboardSharePasswordSchema = z.object({
  password: z.string().min(1, "Password is required."),
});

export const transferLeadsSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().optional(),
  websiteId: z.string().optional(),
  unassignOnly: z.boolean().default(false),
});

export const removeWebsiteAccessSchema = z.object({
  userId: z.string().min(1),
  websiteId: z.string().min(1),
  reassignToUserId: z.string().optional(),
  unassignLeads: z.boolean().default(true),
});

export type CreateDashboardShareInput = z.infer<typeof createDashboardShareSchema>;
export type UpdateDashboardShareInput = z.infer<typeof updateDashboardShareSchema>;
export type TransferLeadsInput = z.infer<typeof transferLeadsSchema>;
export type RemoveWebsiteAccessInput = z.infer<typeof removeWebsiteAccessSchema>;
