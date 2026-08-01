import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import {
  buildDashboardAccessCookieValue,
  getDashboardAccessCookieName,
  getDashboardAccessCookieOptions,
  verifyDashboardAccessToken,
} from "@/lib/share-access-cookie";
import {
  assertCanAccessWebsite,
  canCreateDashboardShare,
  canDeleteDashboardShare,
  canEditDashboardShare,
  canManageDashboardShareRecord,
  canRevokeDashboardShare,
  canViewDashboardAccessLogs,
  PermissionError,
} from "@/lib/permissions";
import {
  calculatePercentChange,
  resolveReportingPeriod,
  safeRate,
} from "@/lib/reporting-periods";
import type {
  CreateDashboardShareInput,
  UpdateDashboardShareInput,
} from "@/lib/validation/dashboard-share.schema";
import {
  createDashboardAccessLog,
  createDashboardShare,
  deleteDashboardShare,
  findDashboardShareById,
  findDashboardShareBySlug,
  incrementDashboardShareViewCount,
  listDashboardAccessLogs,
  listDashboardSharesForWebsite,
  recordPasswordAttempt,
  resolveShareStatus,
  toSafeDashboardShare,
  updateDashboardShare,
} from "@/repositories/dashboard-shares.repository";
import { findContactsByIds } from "@/repositories/contacts.repository";
import { findUserById } from "@/repositories/users.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import { listLeads } from "@/repositories/leads.repository";
import {
  getWebsitePerformanceAggregate,
  type WebsitePerformanceAggregate,
} from "@/services/website-performance.service";
import type { SessionUser, UserRole } from "@/types/auth";
import type {
  DashboardAccessStatus,
  DashboardPeriodPreset,
  SafeDashboardShare,
  DashboardShare,
} from "@/types/dashboard-share";
import {
  LEAD_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import {
  buildPaginatedResult,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/pagination";
import type { LeadStatus, SourceSystem } from "@/types/lead";

export interface PublicShareLeadRow {
  id: string;
  leadNumber: string;
  contactName: string;
  email: string;
  phone: string;
  service: string;
  status: string;
  source: string;
  createdAt: string;
}

const MAX_PASSWORD_ATTEMPTS = 5;

function generateShareSlug(): string {
  return randomBytes(12).toString("base64url");
}

export async function listSharesForWebsite(
  user: SessionUser,
  websiteId: string
): Promise<SafeDashboardShare[]> {
  assertCanAccessWebsite(user, websiteId);
  if (!canCreateDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to view dashboard shares.");
  }
  return listDashboardSharesForWebsite(websiteId);
}

export async function getShareForAdmin(
  user: SessionUser,
  shareId: string
): Promise<SafeDashboardShare> {
  const share = await findDashboardShareById(shareId);
  if (!share) {
    throw new Error("Dashboard share not found.");
  }
  assertCanAccessWebsite(user, share.websiteId.toHexString());
  if (!canCreateDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to view dashboard shares.");
  }
  return toSafeDashboardShare(share);
}

export async function createShareForWebsite(
  user: SessionUser,
  websiteId: string,
  input: CreateDashboardShareInput
): Promise<SafeDashboardShare> {
  assertCanAccessWebsite(user, websiteId);
  if (!canCreateDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to create dashboard shares.");
  }

  const website = await findWebsiteById(websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  const now = new Date();
  let passwordHash: string | undefined;
  if (input.access.passwordProtected) {
    if (!input.access.password) {
      throw new Error("Password is required for protected shares.");
    }
    passwordHash = await hashPassword(input.access.password);
  }

  const share = await createDashboardShare({
    websiteId: new ObjectId(websiteId),
    name: input.name.trim(),
    title: input.title.trim(),
    shareSlug: generateShareSlug(),
    status: "active",
    periodPreset: input.periodPreset as DashboardPeriodPreset,
    customStartDate: input.customStartDate
      ? new Date(input.customStartDate)
      : undefined,
    customEndDate: input.customEndDate
      ? new Date(input.customEndDate)
      : undefined,
    visibleMetrics: input.visibleMetrics,
    visibleCharts: input.visibleCharts,
    visibleTables: input.visibleTables,
    branding: {
      ...input.branding,
      logoUrl: input.branding.logoUrl || undefined,
      displayName: input.branding.displayName.trim(),
    },
    access: {
      passwordProtected: input.access.passwordProtected,
      passwordHash,
      expiresAt: input.access.expiresAt
        ? new Date(input.access.expiresAt)
        : undefined,
      allowCsvDownload: input.access.allowCsvDownload,
    },
    createdByUserId: new ObjectId(user.id),
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "dashboard_share.created",
    entityType: "dashboard_share",
    entityId: share._id,
    websiteId: websiteId,
    newValues: { name: share.name, shareSlug: share.shareSlug },
  });

  return share;
}

export async function updateShareForWebsite(
  user: SessionUser,
  shareId: string,
  input: UpdateDashboardShareInput
): Promise<SafeDashboardShare> {
  const existing = await findDashboardShareById(shareId);
  if (!existing) {
    throw new Error("Dashboard share not found.");
  }
  assertCanAccessWebsite(user, existing.websiteId.toHexString());
  if (!canEditDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to edit dashboard shares.");
  }

  const update: Parameters<typeof updateDashboardShare>[1] = {};

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.title !== undefined) update.title = input.title.trim();
  if (input.periodPreset !== undefined) {
    update.periodPreset = input.periodPreset as DashboardPeriodPreset;
  }
  if (input.customStartDate !== undefined) {
    update.customStartDate = input.customStartDate
      ? new Date(input.customStartDate)
      : undefined;
  }
  if (input.customEndDate !== undefined) {
    update.customEndDate = input.customEndDate
      ? new Date(input.customEndDate)
      : undefined;
  }
  if (input.visibleMetrics !== undefined) {
    update.visibleMetrics = input.visibleMetrics;
  }
  if (input.visibleCharts !== undefined) {
    update.visibleCharts = input.visibleCharts;
  }
  if (input.visibleTables !== undefined) {
    update.visibleTables = input.visibleTables;
  }
  if (input.branding !== undefined) {
    update.branding = {
      ...input.branding,
      logoUrl: input.branding.logoUrl || undefined,
      displayName: input.branding.displayName?.trim() ?? existing.branding.displayName,
    };
  }
  if (input.status === "revoked") {
    if (!canRevokeDashboardShare(user.role)) {
      throw new PermissionError("You are not allowed to revoke dashboard shares.");
    }
    await assertCanManageShareRecord(user, existing);
    update.status = "revoked";
  }
  if (input.access !== undefined) {
    const accessUpdate = { ...existing.access };
    if (input.access.passwordProtected !== undefined) {
      accessUpdate.passwordProtected = input.access.passwordProtected;
    }
    if (input.access.password) {
      accessUpdate.passwordHash = await hashPassword(input.access.password);
      accessUpdate.passwordProtected = true;
    }
    if (input.access.expiresAt !== undefined) {
      accessUpdate.expiresAt = input.access.expiresAt
        ? new Date(input.access.expiresAt)
        : undefined;
    }
    if (input.access.allowCsvDownload !== undefined) {
      accessUpdate.allowCsvDownload = input.access.allowCsvDownload;
    }
    update.access = accessUpdate;
  }

  await updateDashboardShare(shareId, update);

  await writeAuditLog({
    actingUserId: user.id,
    action: "dashboard_share.updated",
    entityType: "dashboard_share",
    entityId: shareId,
    websiteId: existing.websiteId.toHexString(),
  });

  const updated = await findDashboardShareById(shareId);
  if (!updated) {
    throw new Error("Dashboard share not found after update.");
  }
  return toSafeDashboardShare(updated);
}

export async function regenerateShareSlugForWebsite(
  user: SessionUser,
  shareId: string
): Promise<SafeDashboardShare> {
  const existing = await findDashboardShareById(shareId);
  if (!existing) {
    throw new Error("Dashboard share not found.");
  }
  assertCanAccessWebsite(user, existing.websiteId.toHexString());
  if (!canEditDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to regenerate share links.");
  }

  const shareSlug = generateShareSlug();
  await updateDashboardShare(shareId, { shareSlug });

  await writeAuditLog({
    actingUserId: user.id,
    action: "dashboard_share.slug_regenerated",
    entityType: "dashboard_share",
    entityId: shareId,
    websiteId: existing.websiteId.toHexString(),
  });

  const updated = await findDashboardShareById(shareId);
  if (!updated) {
    throw new Error("Dashboard share not found after regeneration.");
  }
  return toSafeDashboardShare(updated);
}

export async function revokeShareForWebsite(
  user: SessionUser,
  shareId: string
): Promise<void> {
  const existing = await findDashboardShareById(shareId);
  if (!existing) {
    throw new Error("Dashboard share not found.");
  }
  assertCanAccessWebsite(user, existing.websiteId.toHexString());
  if (!canRevokeDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to revoke dashboard shares.");
  }
  await assertCanManageShareRecord(user, existing);

  await updateDashboardShare(shareId, { status: "revoked" });

  await writeAuditLog({
    actingUserId: user.id,
    action: "dashboard_share.revoked",
    entityType: "dashboard_share",
    entityId: shareId,
    websiteId: existing.websiteId.toHexString(),
  });
}

export async function deleteShareForWebsite(
  user: SessionUser,
  shareId: string
): Promise<{ websiteId: string }> {
  const existing = await findDashboardShareById(shareId);
  if (!existing) {
    throw new Error("Dashboard share not found.");
  }
  assertCanAccessWebsite(user, existing.websiteId.toHexString());
  if (!canDeleteDashboardShare(user.role)) {
    throw new PermissionError("You are not allowed to delete dashboard shares.");
  }
  await assertCanManageShareRecord(user, existing);

  if (existing.status !== "revoked") {
    throw new Error("Revoke the share before deleting it.");
  }

  const websiteId = existing.websiteId.toHexString();
  await deleteDashboardShare(shareId);

  await writeAuditLog({
    actingUserId: user.id,
    action: "dashboard_share.deleted",
    entityType: "dashboard_share",
    entityId: shareId,
    websiteId,
    previousValues: {
      name: existing.name,
      shareSlug: existing.shareSlug,
      status: existing.status,
    },
  });

  return { websiteId };
}

export async function canUserManageShare(
  user: SessionUser,
  share: Pick<DashboardShare, "createdByUserId">
): Promise<boolean> {
  if (!canRevokeDashboardShare(user.role) && !canDeleteDashboardShare(user.role)) {
    return false;
  }
  const creator = await findUserById(share.createdByUserId.toHexString());
  return canManageDashboardShareRecord(
    user,
    share,
    (creator?.role as UserRole | undefined) ?? null
  );
}

async function assertCanManageShareRecord(
  user: SessionUser,
  share: Pick<DashboardShare, "createdByUserId">
): Promise<void> {
  const allowed = await canUserManageShare(user, share);
  if (!allowed) {
    throw new PermissionError(
      "You can only revoke or delete your own shares and shares created by people below your role."
    );
  }
}

export async function getShareAccessLogsForAdmin(
  user: SessionUser,
  shareId: string
) {
  const share = await findDashboardShareById(shareId);
  if (!share) {
    throw new Error("Dashboard share not found.");
  }
  assertCanAccessWebsite(user, share.websiteId.toHexString());
  if (!canViewDashboardAccessLogs(user.role)) {
    throw new PermissionError("You are not allowed to view access logs.");
  }
  return listDashboardAccessLogs(shareId);
}

export async function verifySharePassword(
  shareSlug: string,
  password: string
): Promise<
  | { ok: true; cookieName: string; cookieValue: string; cookieOptions: ReturnType<typeof getDashboardAccessCookieOptions> }
  | { ok: false; status: DashboardAccessStatus; attempts: number }
> {
  const share = await findDashboardShareBySlug(shareSlug);
  if (!share) {
    await logShareAccess({ status: "not_found", shareSlug });
    return { ok: false, status: "not_found", attempts: 0 };
  }

  const status = resolveShareStatus(share);
  if (status === "revoked") {
    await logShareAccess({
      status: "revoked",
      shareId: share._id.toHexString(),
      websiteId: share.websiteId.toHexString(),
    });
    return { ok: false, status: "revoked", attempts: 0 };
  }
  if (status === "expired") {
    await logShareAccess({
      status: "expired",
      shareId: share._id.toHexString(),
      websiteId: share.websiteId.toHexString(),
    });
    return { ok: false, status: "expired", attempts: 0 };
  }

  if (!share.access.passwordProtected || !share.access.passwordHash) {
    const cookie = buildDashboardAccessCookieValue(share._id.toHexString());
    return {
      ok: true,
      cookieName: getDashboardAccessCookieName(),
      cookieValue: cookie.value,
      cookieOptions: getDashboardAccessCookieOptions(cookie.expiresAt),
    };
  }

  const attempts = await recordPasswordAttempt(share._id.toHexString());
  if (attempts > MAX_PASSWORD_ATTEMPTS) {
    return {
      ok: false,
      status: "password_failed",
      attempts,
    };
  }

  const valid = await verifyPassword(password, share.access.passwordHash);
  if (!valid) {
    await logShareAccess({
      status: "password_failed",
      shareId: share._id.toHexString(),
      websiteId: share.websiteId.toHexString(),
    });
    return {
      ok: false,
      status: "password_failed",
      attempts,
    };
  }

  const cookie = buildDashboardAccessCookieValue(share._id.toHexString());
  return {
    ok: true,
    cookieName: getDashboardAccessCookieName(),
    cookieValue: cookie.value,
    cookieOptions: getDashboardAccessCookieOptions(cookie.expiresAt),
  };
}

export function hasValidShareAccess(
  shareId: string,
  accessToken?: string
): boolean {
  if (!accessToken) {
    return false;
  }
  return verifyDashboardAccessToken(accessToken, shareId);
}

export async function getPublicShareDashboardData(
  shareSlug: string,
  accessToken?: string
): Promise<
  | {
      ok: true;
      share: SafeDashboardShare;
      websiteName: string;
      data: WebsitePerformanceAggregate;
    }
  | { ok: false; status: DashboardAccessStatus; requiresPassword: boolean }
> {
  const share = await findDashboardShareBySlug(shareSlug);
  if (!share) {
    await logShareAccess({ status: "not_found", shareSlug });
    return { ok: false, status: "not_found", requiresPassword: false };
  }

  const status = resolveShareStatus(share);
  if (status === "revoked") {
    await logShareAccess({
      status: "revoked",
      shareId: share._id.toHexString(),
      websiteId: share.websiteId.toHexString(),
    });
    return { ok: false, status: "revoked", requiresPassword: false };
  }
  if (status === "expired") {
    await logShareAccess({
      status: "expired",
      shareId: share._id.toHexString(),
      websiteId: share.websiteId.toHexString(),
    });
    return { ok: false, status: "expired", requiresPassword: false };
  }

  if (
    share.access.passwordProtected &&
    !hasValidShareAccess(share._id.toHexString(), accessToken)
  ) {
    return { ok: false, status: "password_failed", requiresPassword: true };
  }

  const website = await findWebsiteById(share.websiteId.toHexString());
  if (!website) {
    return { ok: false, status: "not_found", requiresPassword: false };
  }

  const period = resolveReportingPeriod({
    preset: share.periodPreset,
    timezone: website.timezone,
    customStartDate: share.customStartDate,
    customEndDate: share.customEndDate,
  });

  const data = await getWebsitePerformanceAggregate(
    share.websiteId.toHexString(),
    {
      startDate: period.startDate,
      endDate: period.endDate,
      previousStartDate: period.previousStartDate,
      previousEndDate: period.previousEndDate,
      timezone: period.timezone,
      granularity: period.granularity,
      visibleMetrics: share.visibleMetrics,
      visibleCharts: share.visibleCharts,
      visibleTables: share.visibleTables,
    }
  );

  await incrementDashboardShareViewCount(share._id.toHexString());
  await logShareAccess({
    status: "successful",
    shareId: share._id.toHexString(),
    websiteId: share.websiteId.toHexString(),
  });

  return {
    ok: true,
    share: toSafeDashboardShare(share),
    websiteName: website.name,
    data,
  };
}

export async function getPublicShareLeadDetails(
  shareSlug: string,
  accessToken: string | undefined,
  pagination: PaginationParams
): Promise<
  | { ok: true; leads: PaginatedResult<PublicShareLeadRow> }
  | { ok: false; status: DashboardAccessStatus; requiresPassword: boolean }
> {
  const share = await findDashboardShareBySlug(shareSlug);
  if (!share) {
    return { ok: false, status: "not_found", requiresPassword: false };
  }

  const status = resolveShareStatus(share);
  if (status === "revoked" || status === "expired") {
    return { ok: false, status, requiresPassword: false };
  }

  if (
    share.access.passwordProtected &&
    !hasValidShareAccess(share._id.toHexString(), accessToken)
  ) {
    return { ok: false, status: "password_failed", requiresPassword: true };
  }

  const website = await findWebsiteById(share.websiteId.toHexString());
  if (!website) {
    return { ok: false, status: "not_found", requiresPassword: false };
  }

  const period = resolveReportingPeriod({
    preset: share.periodPreset,
    timezone: website.timezone,
    customStartDate: share.customStartDate,
    customEndDate: share.customEndDate,
  });

  const { items, total } = await listLeads({
    filters: {
      websiteId: share.websiteId.toHexString(),
      dateFrom: period.startDate,
      dateTo: period.endDate,
      excludeTestLeads: true,
    },
    skip: pagination.skip,
    limit: pagination.limit,
  });

  const contacts = await findContactsByIds(
    items.map((lead) => lead.contactId.toHexString())
  );

  const rows: PublicShareLeadRow[] = items.map((lead) => {
    const contact = contacts.get(lead.contactId.toHexString());
    return {
      id: lead._id.toHexString(),
      leadNumber: lead.leadNumber,
      contactName: contact?.name?.trim() || "—",
      email: contact?.email?.trim() || "—",
      phone: contact?.phone?.trim() || "—",
      service:
        lead.service?.trim() ||
        lead.submittedServiceName?.trim() ||
        "—",
      status:
        LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status,
      source:
        SOURCE_SYSTEM_LABELS[lead.sourceSystem as SourceSystem] ??
        lead.sourceSystem,
      createdAt: lead.createdAt.toISOString(),
    };
  });

  return {
    ok: true,
    leads: buildPaginatedResult(
      rows,
      total,
      pagination.page,
      pagination.pageSize
    ),
  };
}

async function logShareAccess(options: {
  status: DashboardAccessStatus;
  shareId?: string;
  websiteId?: string;
  shareSlug?: string;
}) {
  await createDashboardAccessLog({
    dashboardShareId: options.shareId
      ? new ObjectId(options.shareId)
      : undefined,
    websiteId: options.websiteId ? new ObjectId(options.websiteId) : undefined,
    status: options.status,
    viewedAt: new Date(),
  });
  void options.shareSlug;
}

export { calculatePercentChange, safeRate };
