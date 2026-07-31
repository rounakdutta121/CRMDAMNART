import {
  canViewTeamLeads,
  PermissionError,
  resolveWebsiteFilter,
  userCanViewUnassignedLeads,
} from "@/lib/permissions";
import { buildPaginatedResult, parsePagination } from "@/lib/pagination";
import { formatMonthLabel, getMonthKey } from "@/lib/reporting-periods";
import {
  aggregateLeadsByMonth,
  listLeads,
  type LeadListFilters,
} from "@/repositories/leads.repository";
import { findContactById } from "@/repositories/contacts.repository";
import { listAssignableUsers } from "@/repositories/users.repository";
import { listWebsites } from "@/repositories/websites.repository";
import type { LeadListItem } from "@/services/leads.service";
import type { SessionUser } from "@/types/auth";
import type { Contact } from "@/types/contact";

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export async function getMonthlyLeadsPage(
  user: SessionUser,
  searchParams: Record<string, string | string[] | undefined>
) {
  const pagination = parsePagination(searchParams);
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const now = new Date();
  const selectedYear = Number(get("year")) || now.getFullYear();
  const selectedMonth = get("month") ? Number(get("month")) : undefined;
  const viewMode = get("viewMode") ?? (selectedMonth ? "list" : "monthly");
  const view = get("view");
  const websiteIds = resolveWebsiteFilter(user, get("websiteId"));

  let assignedUserId = get("assignedUserId");
  let assignedUserOnly: string | undefined =
    view === "team" || canViewTeamLeads(user.role)
      ? undefined
      : user.id;

  if (view === "my") {
    assignedUserId = user.id;
    assignedUserOnly = undefined;
  } else if (view === "unassigned") {
    if (!userCanViewUnassignedLeads(user)) {
      throw new PermissionError("You are not allowed to view unassigned leads.");
    }
    assignedUserId = "unassigned";
    assignedUserOnly = undefined;
  } else if (view === "team") {
    if (!canViewTeamLeads(user.role)) {
      throw new PermissionError("You are not allowed to view team leads.");
    }
    assignedUserOnly = undefined;
  }

  const baseFilters: LeadListFilters = {
    websiteIds,
    websiteId: get("websiteId"),
    service: get("service"),
    status: get("status"),
    priority: get("priority"),
    sourceSystem: get("sourceSystem"),
    assignedUserId,
    formId: get("formId"),
    assignedUserOnly,
    includeUnassigned: userCanViewUnassignedLeads(user),
    excludeTestLeads: true,
  };

  const websites = await listWebsites(
    websiteIds === null ? undefined : { ids: websiteIds }
  );
  const timezone =
    websites.find((w) => w._id.toHexString() === get("websiteId"))?.timezone ??
    websites[0]?.timezone ??
    "Asia/Kolkata";

  const monthlyCounts = await aggregateLeadsByMonth(
    baseFilters,
    selectedYear,
    timezone
  );

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthKey = `${selectedYear}-${String(month).padStart(2, "0")}`;
    const row = monthlyCounts.find((item) => item.monthKey === monthKey);
    return {
      month,
      monthKey,
      label: formatMonthLabel(monthKey),
      count: row?.count ?? 0,
    };
  });

  let listItems: LeadListItem[] = [];
  let total = 0;
  let page = pagination.page;
  let totalPages = 0;

  if (viewMode === "list" && selectedMonth) {
    const filters: LeadListFilters = {
      ...baseFilters,
      dateFrom: startOfMonth(selectedYear, selectedMonth),
      dateTo: endOfMonth(selectedYear, selectedMonth),
    };

    const result = await listLeads({
      filters,
      skip: pagination.skip,
      limit: pagination.limit,
    });

    total = result.total;
    const paginated = buildPaginatedResult(
      result.items,
      total,
      pagination.page,
      pagination.pageSize
    );
    page = paginated.page;
    totalPages = paginated.totalPages;

    const websiteMap = new Map(
      websites.map((w) => [w._id.toHexString(), w])
    );
    const users = await listAssignableUsers(
      websiteIds === null ? undefined : websiteIds
    );
    const userMap = new Map(users.map((u) => [u._id.toHexString(), u]));

    const contactIds = [
      ...new Set(result.items.map((lead) => lead.contactId.toHexString())),
    ];
    const contacts = await Promise.all(
      contactIds.map((id) => findContactById(id))
    );
    const contactMap = new Map(
      contacts
        .filter((c): c is Contact => Boolean(c))
        .map((c) => [c._id.toHexString(), c])
    );

    listItems = result.items.map((lead) => ({
      lead,
      contact: contactMap.get(lead.contactId.toHexString()) ?? null,
      website: websiteMap.get(lead.websiteId.toHexString()) ?? null,
      assignedUser: lead.assignedUserId
        ? userMap.get(lead.assignedUserId.toHexString()) ?? null
        : null,
    }));
  }

  const yearTotal = months.reduce((sum, month) => sum + month.count, 0);

  return {
    view: view ?? null,
    viewMode,
    selectedYear,
    selectedMonth,
    months,
    yearTotal,
    currentMonthKey: getMonthKey(now, timezone),
    websites,
    users: await listAssignableUsers(
      websiteIds === null ? undefined : websiteIds
    ),
    items: listItems,
    page,
    totalPages,
    total,
    pageSize: pagination.pageSize,
  };
}
