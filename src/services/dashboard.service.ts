import {
  FULFILMENT_STATUS_LABELS,
  SALES_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import { resolveWebsiteFilter } from "@/lib/permissions";
import { findContactById } from "@/repositories/contacts.repository";
import {
  aggregateLeadsByField,
  countLeads,
  getRecentLeads,
  type LeadListFilters,
} from "@/repositories/leads.repository";
import {
  countFollowUpsDueToday,
  countOverdueFollowUps,
  getUpcomingFollowUps,
} from "@/repositories/follow-ups.repository";
import { listWebsites } from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(value: string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export interface DashboardFilterInput {
  websiteId?: string;
  formId?: string;
  dateFrom?: string;
  dateTo?: string;
  service?: string;
  serviceId?: string;
  assignedUserId?: string;
  sourceSystem?: string;
  includeTestLeads?: boolean;
}

function buildDashboardFilters(
  user: SessionUser,
  filters: DashboardFilterInput = {}
): LeadListFilters {
  const websiteIds = resolveWebsiteFilter(user, filters.websiteId);

  return {
    websiteIds,
    websiteId: filters.websiteId,
    formId: filters.formId,
    service: filters.service,
    serviceId: filters.serviceId,
    assignedUserId: filters.assignedUserId,
    sourceSystem: filters.sourceSystem,
    dateFrom: filters.dateFrom ? startOfDay(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? endOfDay(filters.dateTo) : undefined,
    excludeTestLeads: filters.includeTestLeads !== true,
  };
}

export async function getDashboardData(
  user: SessionUser,
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filters: DashboardFilterInput = {
    websiteId: get("websiteId"),
    formId: get("formId"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    service: get("service"),
    serviceId: get("serviceId"),
    assignedUserId: get("assignedUserId"),
    sourceSystem: get("sourceSystem"),
    includeTestLeads: get("includeTestLeads") === "true",
  };

  const baseFilters = buildDashboardFilters(user, filters);
  const websiteIds = baseFilters.websiteIds ?? null;

  const [
    totalLeads,
    newLeadsToday,
    unassignedLeads,
    followUpsDueToday,
    overdueFollowUps,
    qualifiedLeads,
    confirmedLeads,
    convertedLeads,
    lostLeads,
    byWebsite,
    byStatus,
    bySource,
    recentLeads,
    upcomingFollowUps,
    websites,
  ] = await Promise.all([
    countLeads(baseFilters),
    countLeads({
      ...baseFilters,
      dateFrom: startOfToday(),
      dateTo: endOfToday(),
    }),
    countLeads({ ...baseFilters, assignedUserId: "unassigned" }),
    countFollowUpsDueToday(websiteIds ?? null),
    countOverdueFollowUps(websiteIds ?? null),
    countLeads({ ...baseFilters, salesStatus: "qualified" }),
    countLeads({ ...baseFilters, salesStatus: "confirmed" }),
    countLeads({ ...baseFilters, salesStatus: "converted" }),
    countLeads({ ...baseFilters, salesStatus: "lost" }),
    aggregateLeadsByField("websiteId", baseFilters),
    aggregateLeadsByField("salesStatus", baseFilters),
    aggregateLeadsByField("sourceSystem", baseFilters),
    getRecentLeads(baseFilters, 5),
    getUpcomingFollowUps(websiteIds ?? null, 5),
    listWebsites(websiteIds === null ? undefined : { ids: websiteIds }),
  ]);

  const websiteMap = new Map(
    websites.map((w) => [w._id.toHexString(), w.name])
  );

  const recentWithContacts = await Promise.all(
    recentLeads.map(async (lead) => {
      const contact = await findContactById(lead.contactId.toHexString());
      return {
        lead,
        contactName: contact?.name ?? "Unknown",
        websiteName: websiteMap.get(lead.websiteId.toHexString()) ?? "Unknown",
      };
    })
  );

  const upcomingWithMeta = await Promise.all(
    upcomingFollowUps.map(async (followUp) => {
      const contact = await findContactById(followUp.contactId.toHexString());
      return {
        followUp,
        contactName: contact?.name ?? "Unknown",
        websiteName:
          websiteMap.get(followUp.websiteId.toHexString()) ?? "Unknown",
      };
    })
  );

  const maxWebsiteCount = Math.max(1, ...byWebsite.map((row) => row.count));
  const maxStatusCount = Math.max(1, ...byStatus.map((row) => row.count));
  const maxSourceCount = Math.max(1, ...bySource.map((row) => row.count));
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;

  return {
    stats: {
      totalLeads,
      newLeadsToday,
      unassignedLeads,
      followUpsDueToday,
      overdueFollowUps,
      qualifiedLeads,
      confirmedLeads,
      convertedLeads,
      lostLeads,
      conversionRate,
    },
    filters: {
      websiteId: filters.websiteId ?? "",
      dateFrom: filters.dateFrom ?? "",
      dateTo: filters.dateTo ?? "",
      formId: filters.formId,
      service: filters.service,
      serviceId: filters.serviceId,
      assignedUserId: filters.assignedUserId,
      sourceSystem: filters.sourceSystem,
      includeTestLeads: filters.includeTestLeads,
    },
    byWebsite: byWebsite.map((row) => ({
      label: websiteMap.get(row.key) ?? row.key,
      count: row.count,
      percent: Math.round((row.count / maxWebsiteCount) * 100),
    })),
    byStatus: byStatus.map((row) => ({
      label:
        SALES_STATUS_LABELS[row.key as keyof typeof SALES_STATUS_LABELS] ??
        row.key,
      count: row.count,
      percent: Math.round((row.count / maxStatusCount) * 100),
    })),
    bySource: bySource.map((row) => ({
      label:
        SOURCE_SYSTEM_LABELS[row.key as keyof typeof SOURCE_SYSTEM_LABELS] ??
        row.key,
      count: row.count,
      percent: Math.round((row.count / maxSourceCount) * 100),
    })),
    recentLeads: recentWithContacts,
    upcomingFollowUps: upcomingWithMeta,
    fulfilmentLabels: FULFILMENT_STATUS_LABELS,
    websites,
  };
}
