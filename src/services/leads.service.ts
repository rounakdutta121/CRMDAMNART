import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import {
  SALES_STATUS_LABELS,
  FULFILMENT_STATUS_LABELS,
} from "@/lib/constants";
import { generateLeadNumber } from "@/lib/lead-number";
import {
  normalizeOptionalString,
} from "@/lib/normalization";
import { buildPaginatedResult, parsePagination } from "@/lib/pagination";
import {
  assertCanAccessWebsite,
  assertCanAssignLeadToUser,
  canAddNotes,
  canAssignLeads,
  canChangeFulfilmentStatus,
  canChangeSalesStatus,
  canCreateManualLeads,
  canDeleteLeads,
  canEditLeads,
  canPerformBulkActions,
  canViewAllLeadsInWebsite,
  canViewAttribution,
  canViewSensitiveFields,
  canViewTeamLeads,
  canReceiveLeadForWebsite,
  PermissionError,
  resolveWebsiteFilter,
  userCanViewUnassignedLeads,
} from "@/lib/permissions";
import type {
  AddNoteInput,
  ContactAttemptInput,
  CreateManualLeadFromFormInput,
  CreateManualLeadInput,
  ScheduleFollowUpInput,
  UpdateLeadInput,
} from "@/lib/validation/lead.schema";
import { createActivity, listActivitiesByLeadId } from "@/repositories/activities.repository";
import {
  createAttribution,
  findAttributionByLeadId,
  findLeadIdsWithAttribution,
  findLeadIdsWithGclid,
} from "@/repositories/attributions.repository";
import { findServiceById, listServicesForWebsite } from "@/repositories/services.repository";
import { findContactById, findDuplicateContacts } from "@/repositories/contacts.repository";
import {
  bulkUpdateLeads,
  createLead,
  deleteLeadById,
  deleteLeadRelatedRecords,
  findLeadById,
  listLeads,
  updateLead,
} from "@/repositories/leads.repository";
import { createAssignmentHistory, listByLeadId } from "@/repositories/assignment-history.repository";
import { notifyLeadAssignment } from "@/repositories/notifications.repository";
import { findFormById, listFormsByWebsite } from "@/repositories/forms.repository";
import type { BulkLeadActionInput } from "@/lib/validation/bulk.schema";
import { getActiveFields } from "@/lib/form-schema";
import { findUserById, listAssignableUsers } from "@/repositories/users.repository";
import { findWebsiteById, listWebsites } from "@/repositories/websites.repository";
import { findOrCreateContact } from "@/services/contacts.service";
import {
  FormSubmissionMappingError,
  mapFormSubmission,
} from "@/services/form-submission-mapper.service";
import { scheduleFollowUp } from "@/services/follow-ups.service";
import type { CRMService } from "@/types/service";
import type { WebsiteForm } from "@/types/form";
import type { SessionUser } from "@/types/auth";
import type { LeadActivity } from "@/types/activity";
import type { LeadAttribution } from "@/types/attribution";
import type { Contact } from "@/types/contact";
import type {
  FulfilmentStatus,
  Lead,
  LeadPriority,
  SalesStatus,
} from "@/types/lead";
import type { SafeWebsite } from "@/types/website";
import type { SafeCRMUser } from "@/types/auth";

export interface LeadListItem {
  lead: Lead;
  contact: Contact | null;
  website: SafeWebsite | null;
  assignedUser: SafeCRMUser | null;
}

export interface LeadDetail {
  lead: Lead;
  contact: Contact;
  website: SafeWebsite;
  attribution: LeadAttribution | null;
  activities: LeadActivity[];
  assignedUser: SafeCRMUser | null;
  canViewAttribution: boolean;
  assignmentHistory: Awaited<ReturnType<typeof listByLeadId>>;
  possibleDuplicates: Contact[];
  canViewSensitiveFields: boolean;
}

export interface DynamicColumn {
  id: string;
  label: string;
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

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export async function getLeadsPage(
  user: SessionUser,
  searchParams: Record<string, string | string[] | undefined>
) {
  const pagination = parsePagination(searchParams);
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const websiteIds = resolveWebsiteFilter(user, get("websiteId"));
  const view = get("view");
  const viewMode = get("viewMode");
  const selectedYear = get("year");
  const selectedMonth = get("month");
  let assignedUserId = get("assignedUserId");
  let assignedUserOnly =
    !canViewAllLeadsInWebsite(user.role) ? user.id : undefined;

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

  const formId = get("formId");
  let dynamicColumns: DynamicColumn[] = [];

  if (formId) {
    const form = await findFormById(formId);
    if (form) {
      dynamicColumns = getActiveFields(form)
        .filter((field) => field.showOnLeadList)
        .slice(0, 5)
        .map((field) => ({ id: field.id, label: field.label }));
    }
  }

  const search = get("search");
  let contactIds: ObjectId[] | undefined;

  if (search) {
    const { getDb } = await import("@/lib/mongodb");
    const { COLLECTIONS } = await import("@/lib/constants");
    const db = await getDb();
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    const contacts = await db
      .collection("contacts")
      .find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex },
          { company: regex },
        ],
      })
      .project({ _id: 1 })
      .limit(200)
      .toArray();

    contactIds = contacts.map((c) => c._id as ObjectId);

    // Also match lead numbers directly via a separate path below
    void COLLECTIONS;
  }

  let leadIdsWithGclid: ObjectId[] | undefined;
  let leadIdsMissingAttribution: ObjectId[] | undefined;

  if (get("hasGclid") === "true") {
    leadIdsWithGclid = await findLeadIdsWithGclid(websiteIds);
  }

  if (get("missingAttribution") === "true") {
    const withAttr = await findLeadIdsWithAttribution(websiteIds);
    leadIdsMissingAttribution = withAttr;
  }

  const filters = {
    websiteIds,
    websiteId: get("websiteId"),
    service: get("service"),
    salesStatus: get("salesStatus"),
    fulfilmentStatus: get("fulfilmentStatus"),
    priority: get("priority"),
    sourceSystem: get("sourceSystem"),
    assignedUserId,
    formId,
    dateFrom: get("dateFrom")
      ? startOfDay(get("dateFrom")!)
      : viewMode === "monthly" && selectedYear && selectedMonth
        ? startOfMonth(Number(selectedYear), Number(selectedMonth))
        : undefined,
    dateTo: get("dateTo")
      ? endOfDay(get("dateTo")!)
      : viewMode === "monthly" && selectedYear && selectedMonth
        ? endOfMonth(Number(selectedYear), Number(selectedMonth))
        : undefined,
    followUpDue: get("followUpDue") as
      | "today"
      | "overdue"
      | "upcoming"
      | undefined,
    leadIdsWithGclid,
    leadIdsMissingAttribution,
    contactIds,
    assignedUserOnly,
    includeUnassigned: userCanViewUnassignedLeads(user),
  };

  // If searching, also include leads whose leadNumber matches
  let { items, total } = await listLeads({
    filters,
    skip: pagination.skip,
    limit: pagination.limit,
  });

  if (search) {
    const leadNumberMatches = await listLeads({
      filters: {
        websiteIds,
        ...Object.fromEntries(
          Object.entries(filters).filter(([k]) => k !== "contactIds")
        ),
      },
      skip: 0,
      limit: 200,
    });

    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    const matchingByNumber = leadNumberMatches.items.filter((lead) =>
      regex.test(lead.leadNumber)
    );

    if (matchingByNumber.length > 0) {
      const byId = new Map(items.map((l) => [l._id.toHexString(), l]));
      for (const lead of matchingByNumber) {
        byId.set(lead._id.toHexString(), lead);
      }
      items = Array.from(byId.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      // Approximate total when merging search paths
      total = Math.max(total, items.length);
    }

    // Also filter current page items by search if contactIds was empty
    if ((!contactIds || contactIds.length === 0) && matchingByNumber.length === 0) {
      items = [];
      total = 0;
    }
  }

  const websites = await listWebsites(
    websiteIds === null ? undefined : { ids: websiteIds }
  );
  const websiteMap = new Map(
    websites.map((w) => [w._id.toHexString(), w])
  );

  const users = await listAssignableUsers(
    websiteIds === null ? undefined : websiteIds
  );
  const userMap = new Map(users.map((u) => [u._id.toHexString(), u]));

  const contactIdsNeeded = [
    ...new Set(items.map((lead) => lead.contactId.toHexString())),
  ];
  const contacts = await Promise.all(
    contactIdsNeeded.map((id) => findContactById(id))
  );
  const contactMap = new Map(
    contacts
      .filter((c): c is Contact => Boolean(c))
      .map((c) => [c._id.toHexString(), c])
  );

  const listItems: LeadListItem[] = items.map((lead) => ({
    lead,
    contact: contactMap.get(lead.contactId.toHexString()) ?? null,
    website: websiteMap.get(lead.websiteId.toHexString()) ?? null,
    assignedUser: lead.assignedUserId
      ? userMap.get(lead.assignedUserId.toHexString()) ?? null
      : null,
  }));

  const forms =
    filterValuesWebsiteId(websiteIds, get("websiteId")).length === 1
      ? await listFormsByWebsite(
          filterValuesWebsiteId(websiteIds, get("websiteId"))[0]!
        )
      : [];

  return {
    ...buildPaginatedResult(
      listItems,
      total,
      pagination.page,
      pagination.pageSize
    ),
    websites,
    users,
    forms,
    dynamicColumns,
    view: view ?? null,
  };
}

function filterValuesWebsiteId(
  websiteIds: string[] | null,
  requested?: string
): string[] {
  if (requested) {
    return [requested];
  }
  if (websiteIds === null) {
    return [];
  }
  return websiteIds;
}

export async function getLeadDetail(
  user: SessionUser,
  leadId: string
): Promise<LeadDetail> {
  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }

  assertCanAccessWebsite(user, lead.websiteId.toHexString());

  if (
    !canViewAllLeadsInWebsite(user.role) &&
    lead.assignedUserId?.toHexString() !== user.id &&
    !(userCanViewUnassignedLeads(user) && !lead.assignedUserId)
  ) {
    throw new PermissionError("You do not have access to this lead.");
  }

  const [
    contact,
    websiteDoc,
    attribution,
    activities,
    assigned,
    assignmentHistory,
    possibleDuplicates,
  ] = await Promise.all([
    findContactById(lead.contactId.toHexString()),
    findWebsiteById(lead.websiteId.toHexString()),
    findAttributionByLeadId(leadId),
    listActivitiesByLeadId(leadId),
    lead.assignedUserId
      ? findUserById(lead.assignedUserId.toHexString())
      : Promise.resolve(null),
    listByLeadId(leadId),
    findDuplicateContacts({
      contactId: lead.contactId.toHexString(),
      excludeContactId: lead.contactId.toHexString(),
    }),
  ]);

  if (!contact || !websiteDoc) {
    throw new Error("Lead related records are missing.");
  }

  const { apiKeyHash: _apiKeyHash, ...safeWebsite } = websiteDoc;
  void _apiKeyHash;

  return {
    lead,
    contact,
    website: safeWebsite,
    attribution: canViewAttribution(user.role) ? attribution : null,
    activities,
    assignedUser: assigned
      ? (() => {
          const { passwordHash: __, ...rest } = assigned;
          void __;
          return rest;
        })()
      : null,
    canViewAttribution: canViewAttribution(user.role),
    assignmentHistory,
    possibleDuplicates,
    canViewSensitiveFields: canViewSensitiveFields(user.role),
  };
}

export async function createManualLead(
  user: SessionUser,
  input: CreateManualLeadInput
): Promise<Lead> {
  if (!canCreateManualLeads(user.role)) {
    throw new PermissionError("You are not allowed to create leads.");
  }

  assertCanAccessWebsite(user, input.websiteId);

  const website = await findWebsiteById(input.websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  const { contact } = await findOrCreateContact({
    name: input.name,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    company: input.company,
    jobTitle: input.jobTitle,
    country: input.country,
    state: input.state,
    city: input.city,
  });

  const now = new Date();
  const leadNumber = await generateLeadNumber(now.getFullYear());
  const assignedUserId = input.assignedUserId
    ? new ObjectId(input.assignedUserId)
    : website.defaultLeadOwnerId;

  const lead = await createLead({
    leadNumber,
    contactId: contact._id,
    websiteId: website._id,
    formName: normalizeOptionalString(input.formName),
    sourceSystem: "manual",
    service: input.service.trim(),
    serviceCategory: normalizeOptionalString(input.serviceCategory),
    message: normalizeOptionalString(input.message),
    assignedUserId,
    salesStatus: input.salesStatus as SalesStatus,
    fulfilmentStatus: "not_started",
    priority: (input.priority ?? "normal") as LeadPriority,
    leadValue: input.leadValue,
    currency: input.currency?.toUpperCase() ?? website.defaultCurrency,
    createdAt: now,
    updatedAt: now,
  });

  await createActivity({
    leadId: lead._id,
    contactId: contact._id,
    websiteId: website._id,
    type: "lead_created",
    description: "Lead created manually.",
    createdByUserId: new ObjectId(user.id),
    createdAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "lead.created_manual",
    entityType: "lead",
    entityId: lead._id,
    websiteId: website._id,
    newValues: {
      leadNumber: lead.leadNumber,
      salesStatus: lead.salesStatus,
      service: lead.service,
    },
  });

  return lead;
}

async function resolveManualLeadService(options: {
  websiteId: string;
  form: WebsiteForm;
  submittedServiceName?: string;
}): Promise<{ serviceId?: ObjectId; serviceName?: string }> {
  if (options.form.defaultServiceId) {
    const service = await findServiceById(options.form.defaultServiceId.toHexString());
    if (service?.isActive) {
      return { serviceId: service._id, serviceName: service.name };
    }
  }

  if (options.submittedServiceName) {
    const normalized = options.submittedServiceName.trim().toLowerCase();
    const services = await listServicesForWebsite(options.websiteId, {
      isActive: true,
    });
    const matched = services.find(
      (service) =>
        service.name.toLowerCase() === normalized ||
        service.code.toLowerCase() === normalized
    );
    if (matched) {
      return { serviceId: matched._id, serviceName: matched.name };
    }
    return { serviceName: options.submittedServiceName };
  }

  return {};
}

async function resolveManualLeadAssignee(options: {
  explicitAssignedUserId?: string;
  form: WebsiteForm;
  service?: CRMService | null;
  website: { _id: ObjectId; defaultLeadOwnerId?: ObjectId };
}): Promise<ObjectId | undefined> {
  if (options.explicitAssignedUserId) {
    const assignee = await findUserById(options.explicitAssignedUserId);
    assertCanAssignLeadToUser(assignee, options.website._id);
    return assignee!._id;
  }

  if (options.form.defaultLeadOwnerId) {
    const assignee = await findUserById(
      options.form.defaultLeadOwnerId.toHexString()
    );
    if (assignee && canReceiveLeadForWebsite(assignee, options.website._id)) {
      return options.form.defaultLeadOwnerId;
    }
  }

  if (options.service?.defaultLeadOwnerId) {
    const assignee = await findUserById(
      options.service.defaultLeadOwnerId.toHexString()
    );
    if (assignee && canReceiveLeadForWebsite(assignee, options.website._id)) {
      return options.service.defaultLeadOwnerId;
    }
  }

  if (options.website.defaultLeadOwnerId) {
    const assignee = await findUserById(
      options.website.defaultLeadOwnerId.toHexString()
    );
    if (assignee && canReceiveLeadForWebsite(assignee, options.website._id)) {
      return options.website.defaultLeadOwnerId;
    }
  }

  return undefined;
}

export async function createManualLeadFromForm(
  user: SessionUser,
  input: CreateManualLeadFromFormInput
): Promise<Lead> {
  if (!canCreateManualLeads(user.role)) {
    throw new PermissionError("You are not allowed to create leads.");
  }

  assertCanAccessWebsite(user, input.websiteId);

  const website = await findWebsiteById(input.websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  const form = await findFormById(input.formId);
  if (!form || form.websiteId.toHexString() !== input.websiteId) {
    throw new Error("Form not found for this website.");
  }

  if (!form.isActive) {
    throw new Error("This form is inactive.");
  }

  let mapped;
  try {
    mapped = mapFormSubmission(input.payload, form);
  } catch (error) {
    if (error instanceof FormSubmissionMappingError) {
      throw new Error(
        error.errors[0]?.message ?? "Form submission validation failed."
      );
    }
    throw error;
  }

  const contactName =
    mapped.contactData.name ??
    [mapped.contactData.firstName, mapped.contactData.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (!contactName) {
    throw new Error("Contact name is required for this form.");
  }

  const serviceResolution = await resolveManualLeadService({
    websiteId: input.websiteId,
    form,
    submittedServiceName: mapped.leadData.service,
  });

  const service =
    serviceResolution.serviceId
      ? await findServiceById(serviceResolution.serviceId.toHexString())
      : null;

  const assignedUserId = await resolveManualLeadAssignee({
    explicitAssignedUserId: input.assignedUserId || undefined,
    form,
    service,
    website,
  });

  const { contact } = await findOrCreateContact({
    name: contactName,
    email: mapped.contactData.email,
    phone: mapped.contactData.phone,
    whatsapp: mapped.contactData.whatsapp,
    company: mapped.contactData.company,
    jobTitle: mapped.contactData.jobTitle,
    country: mapped.contactData.country,
    state: mapped.contactData.state,
    city: mapped.contactData.city,
  });

  const now = new Date();
  const leadNumber = await generateLeadNumber(now.getFullYear());

  const lead = await createLead({
    leadNumber,
    contactId: contact._id,
    websiteId: website._id,
    formId: form._id,
    formCode: form.code,
    formName: form.name,
    formSchemaVersion: mapped.schemaVersion,
    formFieldValues: mapped.customFieldValues,
    sourceSystem: "manual",
    serviceId: serviceResolution.serviceId,
    service: serviceResolution.serviceName ?? mapped.leadData.service ?? "General enquiry",
    submittedServiceName: mapped.leadData.service,
    serviceCategory: mapped.leadData.serviceCategory,
    message: mapped.leadData.message,
    assignedUserId,
    salesStatus: (input.salesStatus ?? "new") as SalesStatus,
    fulfilmentStatus: (input.fulfilmentStatus ?? "not_started") as FulfilmentStatus,
    priority: (input.priority ?? mapped.leadData.priority ?? "normal") as LeadPriority,
    leadValue: input.leadValue ?? mapped.leadData.leadValue,
    currency:
      input.currency?.toUpperCase() ??
      mapped.leadData.currency?.toUpperCase() ??
      website.defaultCurrency,
    createdAt: now,
    updatedAt: now,
  });

  const hasAttribution = Object.values(mapped.attributionData).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  if (hasAttribution && form.attributionEnabled) {
    await createAttribution({
      leadId: lead._id,
      contactId: contact._id,
      websiteId: website._id,
      sessionId: normalizeOptionalString(mapped.attributionData.sessionId),
      gclid: normalizeOptionalString(mapped.attributionData.gclid),
      gbraid: normalizeOptionalString(mapped.attributionData.gbraid),
      wbraid: normalizeOptionalString(mapped.attributionData.wbraid),
      msclkid: normalizeOptionalString(mapped.attributionData.msclkid),
      fbclid: normalizeOptionalString(mapped.attributionData.fbclid),
      utmSource: normalizeOptionalString(mapped.attributionData.utmSource),
      utmMedium: normalizeOptionalString(mapped.attributionData.utmMedium),
      utmCampaign: normalizeOptionalString(mapped.attributionData.utmCampaign),
      utmTerm: normalizeOptionalString(mapped.attributionData.utmTerm),
      utmContent: normalizeOptionalString(mapped.attributionData.utmContent),
      landingPage: normalizeOptionalString(mapped.attributionData.landingPage),
      formPage: normalizeOptionalString(mapped.attributionData.formPage),
      pageUrl: normalizeOptionalString(mapped.attributionData.pageUrl),
      referrer: normalizeOptionalString(mapped.attributionData.referrer),
      touchType: "submission",
      capturedAt: mapped.attributionData.submittedAt ?? now,
    });
  }

  await createActivity({
    leadId: lead._id,
    contactId: contact._id,
    websiteId: website._id,
    type: "lead_created",
    description: `Lead created manually from form "${form.name}".`,
    createdByUserId: new ObjectId(user.id),
    metadata: {
      formCode: form.code,
      sourceSystem: "manual",
    },
    createdAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "lead.created_manual",
    entityType: "lead",
    entityId: lead._id,
    websiteId: website._id,
    newValues: {
      leadNumber: lead.leadNumber,
      formCode: form.code,
      salesStatus: lead.salesStatus,
      service: lead.service,
    },
  });

  return lead;
}

export async function updateLeadForUser(
  user: SessionUser,
  leadId: string,
  input: UpdateLeadInput
): Promise<Lead> {
  if (!canEditLeads(user.role)) {
    throw new PermissionError("You are not allowed to edit leads.");
  }

  const existing = await findLeadById(leadId);
  if (!existing) {
    throw new Error("Lead not found.");
  }

  assertCanAccessWebsite(user, existing.websiteId.toHexString());

  const update: Partial<Lead> = {};
  const now = new Date();

  if (input.service !== undefined) update.service = input.service;
  if (input.serviceCategory !== undefined) {
    update.serviceCategory = normalizeOptionalString(input.serviceCategory);
  }
  if (input.formName !== undefined) {
    update.formName = normalizeOptionalString(input.formName);
  }
  if (input.message !== undefined) {
    update.message = normalizeOptionalString(input.message);
  }
  if (input.priority !== undefined) {
    update.priority = input.priority as LeadPriority;
  }
  if (input.currency !== undefined) {
    update.currency = input.currency.toUpperCase();
  }
  if (input.leadValue !== undefined) {
    update.leadValue = input.leadValue ?? undefined;
  }
  if (input.lostReason !== undefined) {
    update.lostReason = input.lostReason ?? undefined;
  }
  if (input.nextFollowUpAt !== undefined) {
    update.nextFollowUpAt = input.nextFollowUpAt
      ? new Date(input.nextFollowUpAt)
      : undefined;
  }

  if (input.assignedUserId !== undefined) {
    if (!canAssignLeads(user.role)) {
      throw new PermissionError("You are not allowed to assign leads.");
    }
    const previous = existing.assignedUserId?.toHexString() ?? null;
    const next = input.assignedUserId || null;
    if (next) {
      const assignee = await findUserById(next);
      assertCanAssignLeadToUser(assignee, existing.websiteId);
    }
    update.assignedUserId = next ? new ObjectId(next) : undefined;

    if (previous !== next) {
      await createAssignmentHistory({
        leadId: existing._id,
        websiteId: existing.websiteId,
        previousUserId: previous ? new ObjectId(previous) : undefined,
        newUserId: next ? new ObjectId(next) : undefined,
        changedByUserId: new ObjectId(user.id),
        createdAt: now,
      });

      await createActivity({
        leadId: existing._id,
        contactId: existing.contactId,
        websiteId: existing.websiteId,
        type: "assignment_changed",
        description: next
          ? "Lead assignment updated."
          : "Lead unassigned.",
        metadata: { previous, next },
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });

      await writeAuditLog({
        actingUserId: user.id,
        action: "lead.assigned",
        entityType: "lead",
        entityId: leadId,
        websiteId: existing.websiteId,
        previousValues: { assignedUserId: previous },
        newValues: { assignedUserId: next },
      });

      if (next) {
        await notifyLeadAssignment({
          userId: new ObjectId(next),
          type: previous ? "lead_reassigned" : "lead_assigned",
          leadId: existing._id,
          websiteId: existing.websiteId,
          leadNumber: existing.leadNumber,
          actingUserId: new ObjectId(user.id),
        });
      } else if (previous) {
        await notifyLeadAssignment({
          userId: new ObjectId(previous),
          type: "lead_unassigned",
          leadId: existing._id,
          websiteId: existing.websiteId,
          leadNumber: existing.leadNumber,
          actingUserId: new ObjectId(user.id),
        });
      }
    }
  }

  if (input.salesStatus !== undefined) {
    if (!canChangeSalesStatus(user.role)) {
      throw new PermissionError("You are not allowed to change sales status.");
    }

    const nextStatus = input.salesStatus as SalesStatus;
    if (nextStatus !== existing.salesStatus) {
      update.salesStatus = nextStatus;

      await createActivity({
        leadId: existing._id,
        contactId: existing.contactId,
        websiteId: existing.websiteId,
        type: "status_changed",
        description: `Sales status changed from ${SALES_STATUS_LABELS[existing.salesStatus]} to ${SALES_STATUS_LABELS[nextStatus]}.`,
        metadata: {
          previous: existing.salesStatus,
          next: nextStatus,
        },
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });

      await writeAuditLog({
        actingUserId: user.id,
        action: "lead.sales_status_changed",
        entityType: "lead",
        entityId: leadId,
        websiteId: existing.websiteId,
        previousValues: { salesStatus: existing.salesStatus },
        newValues: { salesStatus: nextStatus },
      });

      if (nextStatus === "confirmed" && !existing.confirmedAt) {
        update.confirmedAt = now;
        await createActivity({
          leadId: existing._id,
          contactId: existing.contactId,
          websiteId: existing.websiteId,
          type: "customer_confirmed",
          description: "Customer confirmed.",
          createdByUserId: new ObjectId(user.id),
          createdAt: now,
        });
        await writeAuditLog({
          actingUserId: user.id,
          action: "lead.confirmed",
          entityType: "lead",
          entityId: leadId,
          websiteId: existing.websiteId,
          newValues: { confirmedAt: now.toISOString() },
        });
      }

      if (nextStatus === "converted" && !existing.convertedAt) {
        update.convertedAt = now;
      }
    }
  }

  if (input.fulfilmentStatus !== undefined) {
    if (!canChangeFulfilmentStatus(user.role)) {
      throw new PermissionError(
        "You are not allowed to change fulfilment status."
      );
    }

    const nextStatus = input.fulfilmentStatus as FulfilmentStatus;
    if (nextStatus !== existing.fulfilmentStatus) {
      update.fulfilmentStatus = nextStatus;

      await createActivity({
        leadId: existing._id,
        contactId: existing.contactId,
        websiteId: existing.websiteId,
        type: "fulfilment_status_changed",
        description: `Fulfilment status changed from ${FULFILMENT_STATUS_LABELS[existing.fulfilmentStatus]} to ${FULFILMENT_STATUS_LABELS[nextStatus]}.`,
        metadata: {
          previous: existing.fulfilmentStatus,
          next: nextStatus,
        },
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });

      await writeAuditLog({
        actingUserId: user.id,
        action: "lead.fulfilment_status_changed",
        entityType: "lead",
        entityId: leadId,
        websiteId: existing.websiteId,
        previousValues: { fulfilmentStatus: existing.fulfilmentStatus },
        newValues: { fulfilmentStatus: nextStatus },
      });

      if (nextStatus === "completed" && !existing.completedAt) {
        update.completedAt = now;
        await createActivity({
          leadId: existing._id,
          contactId: existing.contactId,
          websiteId: existing.websiteId,
          type: "service_completed",
          description: "Service marked as completed.",
          createdByUserId: new ObjectId(user.id),
          createdAt: now,
        });
        await writeAuditLog({
          actingUserId: user.id,
          action: "lead.completed",
          entityType: "lead",
          entityId: leadId,
          websiteId: existing.websiteId,
          newValues: { completedAt: now.toISOString() },
        });
      }
    }
  }

  if (Object.keys(update).length > 0) {
    await updateLead(leadId, update);

    if (
      !input.salesStatus &&
      !input.fulfilmentStatus &&
      input.assignedUserId === undefined
    ) {
      await createActivity({
        leadId: existing._id,
        contactId: existing.contactId,
        websiteId: existing.websiteId,
        type: "lead_updated",
        description: "Lead details updated.",
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });
    }
  }

  const updated = await findLeadById(leadId);
  if (!updated) {
    throw new Error("Lead not found after update.");
  }
  return updated;
}

export async function addNoteToLead(
  user: SessionUser,
  leadId: string,
  input: AddNoteInput
): Promise<void> {
  if (!canAddNotes(user.role)) {
    throw new PermissionError("You are not allowed to add notes.");
  }

  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }
  assertCanAccessWebsite(user, lead.websiteId.toHexString());

  await createActivity({
    leadId: lead._id,
    contactId: lead.contactId,
    websiteId: lead.websiteId,
    type: "note_added",
    description: input.note.trim(),
    createdByUserId: new ObjectId(user.id),
    createdAt: new Date(),
  });
}

export async function logContactAttempt(
  user: SessionUser,
  leadId: string,
  input: ContactAttemptInput
): Promise<void> {
  if (!canAddNotes(user.role)) {
    throw new PermissionError("You are not allowed to log contact attempts.");
  }

  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }
  assertCanAccessWebsite(user, lead.websiteId.toHexString());

  const now = new Date();
  await createActivity({
    leadId: lead._id,
    contactId: lead.contactId,
    websiteId: lead.websiteId,
    type: "contact_attempt",
    description: input.note?.trim()
      ? `Contact attempt (${input.method}): ${input.note.trim()}`
      : `Contact attempt via ${input.method}.`,
    metadata: { method: input.method },
    createdByUserId: new ObjectId(user.id),
    createdAt: now,
  });

  if (lead.salesStatus === "new" || lead.salesStatus === "assigned") {
    await updateLead(leadId, { salesStatus: "contact_attempted" });
    await createActivity({
      leadId: lead._id,
      contactId: lead.contactId,
      websiteId: lead.websiteId,
      type: "status_changed",
      description: "Sales status changed to Contact Attempted.",
      createdByUserId: new ObjectId(user.id),
      createdAt: now,
    });
  }
}

export async function scheduleFollowUpForLead(
  user: SessionUser,
  leadId: string,
  input: ScheduleFollowUpInput
) {
  return scheduleFollowUp(user, leadId, input);
}

export async function bulkUpdateLeadsForUser(
  user: SessionUser,
  input: BulkLeadActionInput
): Promise<{ updated: number }> {
  if (!canPerformBulkActions(user.role)) {
    throw new PermissionError("You are not allowed to perform bulk actions.");
  }

  const leads = await Promise.all(input.leadIds.map((id) => findLeadById(id)));
  const validLeads = leads.filter(Boolean);

  for (const lead of validLeads) {
    if (lead) {
      assertCanAccessWebsite(user, lead.websiteId.toHexString());
    }
  }

  const now = new Date();
  let update: Partial<Lead> = {};
  let updated = 0;

  if (input.action === "assign") {
    if (!canAssignLeads(user.role)) {
      throw new PermissionError("You are not allowed to assign leads.");
    }
    const assignedUserId = input.assignedUserId
      ? new ObjectId(input.assignedUserId)
      : undefined;
    if (assignedUserId) {
      const assignee = await findUserById(assignedUserId.toHexString());
      for (const lead of validLeads) {
        if (lead) {
          assertCanAssignLeadToUser(assignee, lead.websiteId);
        }
      }
    }
    update = { assignedUserId };
    updated = await bulkUpdateLeads(input.leadIds, update);

    for (const lead of validLeads) {
      if (!lead) continue;
      const previous = lead.assignedUserId?.toHexString() ?? null;
      const next = input.assignedUserId;
      if (previous !== next) {
        await createAssignmentHistory({
          leadId: lead._id,
          websiteId: lead.websiteId,
          previousUserId: previous ? new ObjectId(previous) : undefined,
          newUserId: next ? new ObjectId(next) : undefined,
          changedByUserId: new ObjectId(user.id),
          createdAt: now,
        });
      }
    }
  } else if (input.action === "change_status") {
    if (input.salesStatus && !canChangeSalesStatus(user.role)) {
      throw new PermissionError("You are not allowed to change sales status.");
    }
    if (input.fulfilmentStatus && !canChangeFulfilmentStatus(user.role)) {
      throw new PermissionError(
        "You are not allowed to change fulfilment status."
      );
    }
    if (input.salesStatus) {
      update.salesStatus = input.salesStatus as SalesStatus;
    }
    if (input.fulfilmentStatus) {
      update.fulfilmentStatus = input.fulfilmentStatus as FulfilmentStatus;
    }
    updated = await bulkUpdateLeads(input.leadIds, update);
  } else if (input.action === "change_priority") {
    update = { priority: input.priority as LeadPriority };
    updated = await bulkUpdateLeads(input.leadIds, update);
  } else if (input.action === "mark_spam") {
    if (!canChangeSalesStatus(user.role)) {
      throw new PermissionError("You are not allowed to mark leads as spam.");
    }
    update = { salesStatus: "spam_invalid" };
    updated = await bulkUpdateLeads(input.leadIds, update);
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: `lead.bulk_${input.action}`,
    entityType: "lead",
    entityId: input.leadIds[0] ?? user.id,
    newValues: { leadIds: input.leadIds, ...update },
  });

  return { updated };
}

export async function deleteLeadForUser(
  user: SessionUser,
  leadId: string
): Promise<void> {
  if (!canDeleteLeads(user.role)) {
    throw new PermissionError("You are not allowed to delete leads.");
  }

  const lead = await findLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }

  assertCanAccessWebsite(user, lead.websiteId.toHexString());

  await deleteLeadRelatedRecords(leadId);
  const deleted = await deleteLeadById(leadId);
  if (!deleted) {
    throw new Error("Lead not found.");
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: "lead.deleted",
    entityType: "lead",
    entityId: leadId,
    websiteId: lead.websiteId.toHexString(),
    previousValues: {
      leadNumber: lead.leadNumber,
      formCode: lead.formCode,
      salesStatus: lead.salesStatus,
    },
  });
}
