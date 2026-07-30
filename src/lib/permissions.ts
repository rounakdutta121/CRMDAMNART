import type { SessionUser, UserRole } from "@/types/auth";
import type { Lead } from "@/types/lead";
import type { SalesStatus } from "@/types/lead";

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function canAccessAllWebsites(role: UserRole): boolean {
  return role === "super_admin";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageWebsites(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageIntegrations(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageForms(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageServices(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageLeadStatuses(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canViewAttribution(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "marketing"
  );
}

export function canAssignLeads(role: UserRole): boolean {
  return (
    role === "super_admin" || role === "admin" || role === "sales_manager"
  );
}

export function canEditLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function canDeleteLeads(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canEditContacts(role: UserRole): boolean {
  return canEditLeads(role);
}

export function canAddNotes(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive" ||
    role === "operations"
  );
}

export function canManageFollowUps(role: UserRole): boolean {
  return canAddNotes(role);
}

export function canChangeSalesStatus(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function canChangeFulfilmentStatus(role: UserRole): boolean {
  return (
    role === "super_admin" || role === "admin" || role === "operations"
  );
}

export function canViewReports(role: UserRole): boolean {
  return role !== "viewer";
}

export function canCreateManualLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function canViewAllLeadsInWebsite(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "marketing" ||
    role === "viewer" ||
    role === "operations"
  );
}

export function canViewUnassignedLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function canExportLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "marketing"
  );
}

export function canImportLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager"
  );
}

export function canMergeContacts(role: UserRole): boolean {
  return (
    role === "super_admin" || role === "admin" || role === "sales_manager"
  );
}

export function canViewIntegrationLogs(role: UserRole): boolean {
  return (
    role === "super_admin" || role === "admin" || role === "marketing"
  );
}

export function canPerformBulkActions(role: UserRole): boolean {
  return (
    role === "super_admin" || role === "admin" || role === "sales_manager"
  );
}

export function defaultCanReceiveLeadAssignments(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function defaultCanViewUnassignedLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager"
  );
}

export function canInviteUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canManageInvitations(role: UserRole): boolean {
  return canInviteUsers(role);
}

export function canViewTeamLeads(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager"
  );
}

export function canTransferLeads(role: UserRole): boolean {
  return canAssignLeads(role);
}

export function canViewWebsitePerformance(role: UserRole): boolean {
  return role !== "viewer";
}

export function canCreateDashboardShare(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "marketing"
  );
}

export function canEditDashboardShare(role: UserRole): boolean {
  return canCreateDashboardShare(role);
}

export function canRevokeDashboardShare(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canViewDashboardAccessLogs(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canExportWebsitePerformance(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "marketing"
  );
}

export function canReceiveLeadForWebsite(
  user: Pick<
    import("@/types/auth").CRMUser,
    "isActive" | "role" | "permittedWebsiteIds" | "canReceiveLeadAssignments"
  >,
  websiteId: import("mongodb").ObjectId | string
): boolean {
  if (!user.isActive) {
    return false;
  }
  // Viewers are read-only and can never receive lead assignments.
  if (user.role === "viewer") {
    return false;
  }
  const canReceive =
    user.canReceiveLeadAssignments ??
    defaultCanReceiveLeadAssignments(user.role);
  if (!canReceive) {
    return false;
  }
  if (user.role === "super_admin") {
    return true;
  }
  const websiteIdString =
    typeof websiteId === "string" ? websiteId : websiteId.toHexString();
  return user.permittedWebsiteIds.some(
    (id) => id.toHexString() === websiteIdString
  );
}

export function assertCanAssignLeadToUser(
  assignee: Pick<
    import("@/types/auth").CRMUser,
    "isActive" | "role" | "permittedWebsiteIds" | "canReceiveLeadAssignments"
  > | null,
  websiteId: import("mongodb").ObjectId | string
): void {
  if (!assignee) {
    throw new PermissionError("Assigned user not found.");
  }
  if (!canReceiveLeadForWebsite(assignee, websiteId)) {
    throw new PermissionError(
      "This user cannot receive leads for this website."
    );
  }
}

export function userCanViewUnassignedLeads(user: SessionUser): boolean {
  if (
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.role === "sales_manager"
  ) {
    return true;
  }
  return user.canViewUnassignedLeads;
}

export function canViewSensitiveFields(role: UserRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function isReadOnly(role: UserRole): boolean {
  return role === "viewer" || role === "marketing";
}

export function getPermittedSalesStatuses(role: UserRole): SalesStatus[] | "all" {
  if (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager"
  ) {
    return "all";
  }

  if (role === "sales_executive") {
    return [
      "new",
      "assigned",
      "contact_attempted",
      "contacted",
      "follow_up_required",
      "qualified",
      "proposal_sent",
      "negotiation",
      "confirmed",
      "payment_pending",
      "converted",
      "lost",
      "duplicate",
      "spam_invalid",
    ];
  }

  return [];
}

export function resolveWebsiteFilter(
  user: SessionUser,
  requestedWebsiteId?: string
): string[] | null {
  if (canAccessAllWebsites(user.role)) {
    return requestedWebsiteId ? [requestedWebsiteId] : null;
  }

  const permitted = user.permittedWebsiteIds;

  if (requestedWebsiteId) {
    if (!permitted.includes(requestedWebsiteId)) {
      return [];
    }
    return [requestedWebsiteId];
  }

  return permitted;
}

export function canAccessWebsite(
  user: SessionUser,
  websiteId: string
): boolean {
  if (canAccessAllWebsites(user.role)) {
    return true;
  }
  return user.permittedWebsiteIds.includes(websiteId);
}

export function canViewLead(user: SessionUser, lead: Lead): boolean {
  if (!canAccessWebsite(user, lead.websiteId.toHexString())) {
    return false;
  }

  if (canViewTeamLeads(user.role)) {
    return true;
  }

  if (
    canViewAllLeadsInWebsite(user.role) &&
    user.role !== "sales_executive"
  ) {
    return true;
  }

  if (lead.assignedUserId?.toHexString() === user.id) {
    return true;
  }

  return userCanViewUnassignedLeads(user) && !lead.assignedUserId;
}

export function assertCanAccessWebsite(
  user: SessionUser,
  websiteId: string
): void {
  if (!canAccessWebsite(user, websiteId)) {
    throw new PermissionError("You do not have access to this website.");
  }
}

export function assertCanViewLead(user: SessionUser, lead: Lead): void {
  if (!canViewLead(user, lead)) {
    throw new PermissionError("You do not have access to this lead.");
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}
