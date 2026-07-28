import { buildPaginatedResult, parsePagination } from "@/lib/pagination";
import {
  canViewIntegrationLogs,
  PermissionError,
  resolveWebsiteFilter,
} from "@/lib/permissions";
import { listIntegrationLogs } from "@/repositories/integration-logs.repository";
import { findWebsiteById, listWebsites } from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";
import type { IntegrationLogStatus } from "@/types/integration-log";

export async function getIntegrationLogsPage(
  user: SessionUser,
  searchParams: Record<string, string | string[] | undefined>
) {
  if (!canViewIntegrationLogs(user.role)) {
    throw new PermissionError("You are not allowed to view integration logs.");
  }

  const pagination = parsePagination(searchParams);
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const websiteIds = resolveWebsiteFilter(user, get("websiteId"));
  const { items, total } = await listIntegrationLogs({
    filters: {
      websiteId: get("websiteId"),
      status: get("status") as IntegrationLogStatus | undefined,
      integrationType: get("integrationType") as
        | "website"
        | "n8n"
        | "apps_script"
        | "import"
        | "other"
        | undefined,
      dateFrom: get("dateFrom") ? new Date(get("dateFrom")!) : undefined,
      dateTo: get("dateTo") ? new Date(get("dateTo")!) : undefined,
    },
    skip: pagination.skip,
    limit: pagination.limit,
  });

  const websites = await listWebsites(
    websiteIds === null ? undefined : { ids: websiteIds }
  );
  const websiteMap = new Map(websites.map((w) => [w._id.toHexString(), w]));

  const enriched = await Promise.all(
    items.map(async (log) => ({
      log,
      website: log.websiteId
        ? (websiteMap.get(log.websiteId.toHexString()) ??
          (await findWebsiteById(log.websiteId.toHexString())))
        : null,
    }))
  );

  return {
    ...buildPaginatedResult(enriched, total, pagination.page, pagination.pageSize),
    websites,
  };
}
