import {
  LEAD_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import {
  assertCanAccessWebsite,
  canViewAttribution,
} from "@/lib/permissions";
import {
  aggregateLeadsByField,
  countLeads,
  getRecentLeads,
  type LeadListFilters,
} from "@/repositories/leads.repository";
import { findContactById } from "@/repositories/contacts.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";
import type { DashboardFilterInput } from "@/services/dashboard.service";

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

function buildWebsiteDashboardFilters(
  websiteId: string,
  searchParams: Record<string, string | string[] | undefined> = {}
): LeadListFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    websiteIds: [websiteId],
    formId: get("formId"),
    service: get("service"),
    serviceId: get("serviceId"),
    assignedUserId: get("assignedUserId"),
    sourceSystem: get("sourceSystem"),
    dateFrom: get("dateFrom") ? startOfDay(get("dateFrom")!) : undefined,
    dateTo: get("dateTo") ? endOfDay(get("dateTo")!) : undefined,
    excludeTestLeads: get("includeTestLeads") !== "true",
  };
}

export async function getWebsiteDashboardData(
  user: SessionUser,
  websiteId: string,
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  assertCanAccessWebsite(user, websiteId);
  const website = await findWebsiteById(websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  const baseFilters = buildWebsiteDashboardFilters(websiteId, searchParams);
  const websiteIds = [websiteId];

  const [
    totalLeads,
    newLeadsToday,
    unassignedLeads,
    qualifiedLeads,
    convertedLeads,
    byStatus,
    bySource,
    recentLeads,
  ] = await Promise.all([
    countLeads(baseFilters),
    countLeads({
      ...baseFilters,
      dateFrom: startOfToday(),
      dateTo: endOfToday(),
    }),
    countLeads({ ...baseFilters, assignedUserId: "unassigned" }),
    countLeads({ ...baseFilters, status: "qualified" }),
    countLeads({ ...baseFilters, status: "converted" }),
    aggregateLeadsByField("status", baseFilters),
    aggregateLeadsByField("sourceSystem", baseFilters),
    getRecentLeads(baseFilters, 8),
  ]);

  const recentWithContacts = await Promise.all(
    recentLeads.map(async (lead) => {
      const contact = await findContactById(lead.contactId.toHexString());
      return {
        lead,
        contactName: contact?.name ?? "Unknown",
      };
    })
  );

  const maxStatusCount = Math.max(1, ...byStatus.map((row) => row.count));
  const maxSourceCount = Math.max(1, ...bySource.map((row) => row.count));
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;

  const { apiKeyHash: _apiKeyHash, ...safeWebsite } = website;
  void _apiKeyHash;
  void websiteIds;

  const filters: DashboardFilterInput = {
    websiteId,
    formId: baseFilters.formId,
    service: baseFilters.service,
    serviceId: baseFilters.serviceId,
    assignedUserId:
      baseFilters.assignedUserId === "unassigned"
        ? "unassigned"
        : baseFilters.assignedUserId,
    sourceSystem: baseFilters.sourceSystem,
    dateFrom: searchParams.dateFrom as string | undefined,
    dateTo: searchParams.dateTo as string | undefined,
    includeTestLeads: searchParams.includeTestLeads === "true",
  };

  return {
    website: safeWebsite,
    canViewAttribution: canViewAttribution(user.role),
    filters,
    stats: {
      totalLeads,
      newLeadsToday,
      unassignedLeads,
      followUpsDueToday: 0,
      overdueFollowUps: 0,
      qualifiedLeads,
      convertedLeads,
      conversionRate,
    },
    byStatus: byStatus.map((row) => ({
      label:
        LEAD_STATUS_LABELS[row.key as keyof typeof LEAD_STATUS_LABELS] ??
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
    upcomingFollowUps: [] as Array<{
      followUp: { _id: { toHexString(): string }; method: string; scheduledAt: Date };
      contactName: string;
    }>,
  };
}
