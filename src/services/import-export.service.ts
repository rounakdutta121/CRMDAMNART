import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { parseCsv, toCsv } from "@/lib/csv";
import { generateLeadNumber } from "@/lib/lead-number";
import { normalizeOptionalString } from "@/lib/normalization";
import {
  assertCanAccessWebsite,
  assertCanViewLead,
  canExportLeads,
  canImportLeads,
  PermissionError,
  resolveWebsiteFilter,
} from "@/lib/permissions";
import type { ImportColumnMappingInput } from "@/lib/validation/import.schema";
import { createActivity } from "@/repositories/activities.repository";
import { findContactById } from "@/repositories/contacts.repository";
import {
  createLead,
  findLeadById,
  listLeads,
} from "@/repositories/leads.repository";
import { findUserById } from "@/repositories/users.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import { findOrCreateContact } from "@/services/contacts.service";
import type { SessionUser } from "@/types/auth";
import type { LeadFormFieldValue } from "@/types/form";
import type { LeadPriority, LeadStatus } from "@/types/lead";
import {
  LEAD_PRIORITY_LABELS,
  LEAD_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";

export const CANONICAL_IMPORT_FIELDS = [
  "name",
  "email",
  "phone",
  "whatsapp",
  "company",
  "country",
  "state",
  "city",
  "service",
  "message",
  "currency",
  "priority",
  "status",
] as const;

const BASE_EXPORT_HEADERS = [
  "leadNumber",
  "name",
  "email",
  "phone",
  "company",
  "website",
  "service",
  "source",
  "status",
  "priority",
  "assignee",
  "currency",
  "createdAt",
];

function mapImportRow(
  row: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [csvColumn, fieldKey] of Object.entries(mappings)) {
    if (!fieldKey || fieldKey === "skip") {
      continue;
    }
    const value = row[csvColumn]?.trim();
    if (value) {
      mapped[fieldKey] = value;
    }
  }
  return mapped;
}

function formatFieldValue(value: LeadFormFieldValue["value"]): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  return String(value);
}

export function parseImportCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const parsed = parseCsv(text);
  const rows = parsed.rows.map((row) => {
    const record: Record<string, string> = {};
    parsed.headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });
  return { headers: parsed.headers, rows };
}

export async function importLeadsFromCsv(
  user: SessionUser,
  input: ImportColumnMappingInput
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  if (!canImportLeads(user.role)) {
    throw new PermissionError("You are not allowed to import leads.");
  }

  assertCanAccessWebsite(user, input.websiteId);
  const website = await findWebsiteById(input.websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let index = 0; index < input.rows.length; index += 1) {
    const rowNumber = index + 2;
    try {
      const mapped = mapImportRow(input.rows[index], input.mappings);
      const name = mapped.name?.trim();
      const service = mapped.service?.trim();

      if (!name || !service) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: name and service are required.`);
        continue;
      }

      if (!mapped.email?.trim() && !mapped.phone?.trim()) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: provide email or phone.`);
        continue;
      }

      const { contact } = await findOrCreateContact({
        name,
        email: mapped.email,
        phone: mapped.phone,
        whatsapp: mapped.whatsapp,
        company: mapped.company,
        country: mapped.country,
        state: mapped.state,
        city: mapped.city,
      });

      const now = new Date();
      const leadNumber = await generateLeadNumber(now.getFullYear());
      const lead = await createLead({
        leadNumber,
        contactId: contact._id,
        websiteId: website._id,
        sourceSystem: "import",
        service,
        message: normalizeOptionalString(mapped.message),
        assignedUserId: website.defaultLeadOwnerId,
        status:
          (mapped.status as LeadStatus) ?? input.defaultStatus,
        priority: (mapped.priority as LeadPriority) ?? input.defaultPriority,
        currency: mapped.currency?.toUpperCase() ?? website.defaultCurrency,
        createdAt: now,
        updatedAt: now,
      });

      await createActivity({
        leadId: lead._id,
        contactId: contact._id,
        websiteId: website._id,
        type: "lead_created",
        description: "Lead imported from CSV.",
        createdByUserId: new ObjectId(user.id),
        createdAt: now,
      });

      imported += 1;
    } catch (error) {
      skipped += 1;
      errors.push(
        `Row ${rowNumber}: ${error instanceof Error ? error.message : "Import failed."}`
      );
    }
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: "lead.imported",
    entityType: "lead",
    entityId: input.websiteId,
    websiteId: input.websiteId,
    newValues: { imported, skipped },
  });

  return { imported, skipped, errors: errors.slice(0, 20) };
}

export async function exportLeadsToCsv(
  user: SessionUser,
  options: {
    leadIds?: string[];
    filters?: Record<string, string | undefined>;
  }
): Promise<string> {
  if (!canExportLeads(user.role)) {
    throw new PermissionError("You are not allowed to export leads.");
  }

  let leads;

  if (options.leadIds && options.leadIds.length > 0) {
    const fetched = await Promise.all(
      options.leadIds.map((id) => findLeadById(id))
    );
    leads = fetched.filter(Boolean);
    for (const lead of leads) {
      if (lead) {
        assertCanViewLead(user, lead);
      }
    }
  } else {
    const get = (key: string) => options.filters?.[key];
    const websiteIds = resolveWebsiteFilter(user, get("websiteId"));
    const { items } = await listLeads({
      filters: {
        websiteIds,
        websiteId: get("websiteId"),
        formId: get("formId"),
        service: get("service"),
        serviceId: get("serviceId"),
        status: get("status"),
        priority: get("priority"),
        sourceSystem: get("sourceSystem"),
        assignedUserId: get("assignedUserId"),
        dateFrom: get("dateFrom") ? new Date(get("dateFrom")!) : undefined,
        dateTo: get("dateTo") ? new Date(get("dateTo")!) : undefined,
        excludeTestLeads: get("includeTestLeads") !== "true",
      },
      skip: 0,
      limit: 5000,
    });
    leads = items;
  }

  const dynamicHeaders = new Set<string>();
  for (const lead of leads) {
    if (!lead) {
      continue;
    }
    for (const field of lead.formFieldValues ?? []) {
      if (!field.sensitive) {
        dynamicHeaders.add(field.label);
      }
    }
  }

  const headers = [...BASE_EXPORT_HEADERS, ...Array.from(dynamicHeaders).sort()];
  const rows: string[][] = [];

  for (const lead of leads) {
    if (!lead) {
      continue;
    }

    const [contact, website, assignee] = await Promise.all([
      findContactById(lead.contactId.toHexString()),
      findWebsiteById(lead.websiteId.toHexString()),
      lead.assignedUserId
        ? findUserById(lead.assignedUserId.toHexString())
        : Promise.resolve(null),
    ]);

    const customMap = new Map(
      (lead.formFieldValues ?? [])
        .filter((field) => !field.sensitive)
        .map((field) => [field.label, formatFieldValue(field.value)])
    );

    const baseRow = [
      lead.leadNumber,
      contact?.name ?? "",
      contact?.email ?? "",
      contact?.phone ?? "",
      contact?.company ?? "",
      website?.name ?? "",
      lead.service ?? "",
      SOURCE_SYSTEM_LABELS[lead.sourceSystem],
      LEAD_STATUS_LABELS[lead.status],
      LEAD_PRIORITY_LABELS[lead.priority],
      assignee?.name ?? "",
      lead.currency,
      lead.createdAt.toISOString(),
    ];

    rows.push([
      ...baseRow,
      ...Array.from(dynamicHeaders).map((label) => customMap.get(label) ?? ""),
    ]);
  }

  return toCsv(headers, rows);
}
