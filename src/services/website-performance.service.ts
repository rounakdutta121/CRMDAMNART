import {
  SALES_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import {
  assertCanAccessWebsite,
  canViewWebsitePerformance,
  PermissionError,
} from "@/lib/permissions";
import {
  calculatePercentChange,
  resolveReportingPeriod,
  safeRate,
  type ReportingGranularity,
  type ResolvedReportingPeriod,
} from "@/lib/reporting-periods";
import {
  aggregateLeadsByField,
  aggregateLeadsOverTime,
  countLeads,
  countLeadsWithGclid,
  type LeadListFilters,
} from "@/repositories/leads.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";
import type { DashboardPeriodPreset } from "@/types/dashboard-share";

export interface MetricValue {
  value: number;
  previousValue?: number;
  changeLabel?: string;
  changePercent?: number | null;
}

export interface WebsitePerformanceAggregate {
  periodLabel: string;
  metrics: Record<string, MetricValue>;
  charts: {
    leadsOverTime: { period: string; count: number }[];
    byStatus: { label: string; count: number }[];
    bySource: { label: string; count: number }[];
  };
  tables: {
    byStatus: { label: string; count: number }[];
    bySource: { label: string; count: number }[];
  };
}

function buildPerformanceFilters(
  websiteId: string,
  startDate?: Date,
  endDate?: Date
): LeadListFilters {
  return {
    websiteIds: [websiteId],
    dateFrom: startDate,
    dateTo: endDate,
    excludeTestLeads: true,
  };
}

async function buildMetrics(
  currentFilters: LeadListFilters,
  previousFilters: LeadListFilters | null,
  visibleMetrics: string[]
): Promise<Record<string, MetricValue>> {
  const [
    totalLeads,
    qualifiedLeads,
    convertedLeads,
    unassignedLeads,
    withGclid,
    prevTotal,
    prevQualified,
    prevConverted,
    prevUnassigned,
    prevWithGclid,
  ] = await Promise.all([
    countLeads(currentFilters),
    countLeads({ ...currentFilters, salesStatus: "qualified" }),
    countLeads({ ...currentFilters, salesStatus: "converted" }),
    countLeads({ ...currentFilters, assignedUserId: "unassigned" }),
    countLeadsWithGclid(currentFilters),
    previousFilters ? countLeads(previousFilters) : Promise.resolve(0),
    previousFilters
      ? countLeads({ ...previousFilters, salesStatus: "qualified" })
      : Promise.resolve(0),
    previousFilters
      ? countLeads({ ...previousFilters, salesStatus: "converted" })
      : Promise.resolve(0),
    previousFilters
      ? countLeads({ ...previousFilters, assignedUserId: "unassigned" })
      : Promise.resolve(0),
    previousFilters
      ? countLeadsWithGclid(previousFilters)
      : Promise.resolve(0),
  ]);

  const conversionRate = safeRate(convertedLeads, totalLeads);
  const prevConversionRate = safeRate(prevConverted, prevTotal);
  const gclidRate = safeRate(withGclid, totalLeads);
  const prevGclidRate = safeRate(prevWithGclid, prevTotal);

  const allMetrics: Record<string, MetricValue> = {
    total_leads: metric(totalLeads, prevTotal),
    new_leads: metric(totalLeads, prevTotal),
    qualified_leads: metric(qualifiedLeads, prevQualified),
    converted_leads: metric(convertedLeads, prevConverted),
    conversion_rate: metric(conversionRate, prevConversionRate),
    unassigned_leads: metric(unassignedLeads, prevUnassigned),
    gclid_capture_rate: metric(gclidRate, prevGclidRate),
  };

  const result: Record<string, MetricValue> = {};
  for (const key of visibleMetrics) {
    if (allMetrics[key]) {
      result[key] = allMetrics[key];
    }
  }
  return result;
}

function metric(current: number, previous: number): MetricValue {
  const change = calculatePercentChange(current, previous);
  return {
    value: current,
    previousValue: previous,
    changeLabel: change.label,
    changePercent: change.value,
  };
}

export async function getWebsitePerformanceAggregate(
  websiteId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    previousStartDate?: Date;
    previousEndDate?: Date;
    timezone: string;
    granularity: ReportingGranularity;
    visibleMetrics: string[];
    visibleCharts: string[];
    visibleTables: string[];
  }
): Promise<WebsitePerformanceAggregate> {
  const currentFilters = buildPerformanceFilters(
    websiteId,
    options.startDate,
    options.endDate
  );
  const previousFilters =
    options.previousStartDate && options.previousEndDate
      ? buildPerformanceFilters(
          websiteId,
          options.previousStartDate,
          options.previousEndDate
        )
      : null;

  const periodLabel =
    options.startDate && options.endDate
      ? `${options.startDate.toISOString().slice(0, 10)} – ${options.endDate.toISOString().slice(0, 10)}`
      : "All time";

  const [metrics, leadsOverTime, byStatus, bySource] = await Promise.all([
    buildMetrics(currentFilters, previousFilters, options.visibleMetrics),
    options.visibleCharts.includes("leads_over_time")
      ? aggregateLeadsOverTime(
          currentFilters,
          options.granularity,
          options.timezone
        )
      : Promise.resolve([]),
    options.visibleCharts.includes("by_status") ||
    options.visibleTables.includes("by_status")
      ? aggregateLeadsByField("salesStatus", currentFilters)
      : Promise.resolve([]),
    options.visibleCharts.includes("by_source") ||
    options.visibleTables.includes("by_source")
      ? aggregateLeadsByField("sourceSystem", currentFilters)
      : Promise.resolve([]),
  ]);

  const statusRows = byStatus.map((row) => ({
    label:
      SALES_STATUS_LABELS[row.key as keyof typeof SALES_STATUS_LABELS] ??
      row.key,
    count: row.count,
  }));

  const sourceRows = bySource.map((row) => ({
    label:
      SOURCE_SYSTEM_LABELS[row.key as keyof typeof SOURCE_SYSTEM_LABELS] ??
      row.key,
    count: row.count,
  }));

  return {
    periodLabel,
    metrics,
    charts: {
      leadsOverTime,
      byStatus: statusRows,
      bySource: sourceRows,
    },
    tables: {
      byStatus: statusRows,
      bySource: sourceRows,
    },
  };
}

export async function getWebsitePerformancePage(
  user: SessionUser,
  websiteId: string,
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  if (!canViewWebsitePerformance(user.role)) {
    throw new PermissionError("You are not allowed to view website performance.");
  }
  assertCanAccessWebsite(user, websiteId);

  const website = await findWebsiteById(websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const preset = (get("period") ?? "this_month") as DashboardPeriodPreset;
  const period: ResolvedReportingPeriod = resolveReportingPeriod({
    preset,
    timezone: website.timezone,
    customStartDate: get("dateFrom") ? new Date(get("dateFrom")!) : undefined,
    customEndDate: get("dateTo") ? new Date(get("dateTo")!) : undefined,
  });

  const data = await getWebsitePerformanceAggregate(websiteId, {
    startDate: period.startDate,
    endDate: period.endDate,
    previousStartDate: period.previousStartDate,
    previousEndDate: period.previousEndDate,
    timezone: period.timezone,
    granularity: period.granularity,
    visibleMetrics: [
      "total_leads",
      "qualified_leads",
      "converted_leads",
      "conversion_rate",
      "unassigned_leads",
      "gclid_capture_rate",
    ],
    visibleCharts: ["leads_over_time", "by_status", "by_source"],
    visibleTables: ["by_status", "by_source"],
  });

  const { apiKeyHash: _, ...safeWebsite } = website;
  void _;

  return {
    website: safeWebsite,
    period,
    preset,
    data,
  };
}
