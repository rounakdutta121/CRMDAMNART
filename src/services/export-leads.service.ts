import {
  FULFILMENT_STATUS_LABELS,
  LEAD_PRIORITY_LABELS,
  MAX_EXPORT_ROWS,
  SALES_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import {
  assertCanViewLead,
  canExportLeads,
  PermissionError,
  resolveWebsiteFilter,
} from "@/lib/permissions";
import { findContactById } from "@/repositories/contacts.repository";
import {
  findLeadById,
  listLeads,
} from "@/repositories/leads.repository";
import { findUserById } from "@/repositories/users.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";
import type { LeadFormFieldValue } from "@/types/form";

const BASE_HEADERS = [
  "leadNumber",
  "name",
  "email",
  "phone",
  "company",
  "website",
  "service",
  "source",
  "salesStatus",
  "fulfilmentStatus",
  "priority",
  "assignee",
  "leadValue",
  "currency",
  "nextFollowUpAt",
  "createdAt",
];

function formatFieldValue(value: LeadFormFieldValue["value"]): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  return String(value);
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
    const fetched = await Promise.all(options.leadIds.map((id) => findLeadById(id)));
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
        service: get("service"),
        salesStatus: get("salesStatus"),
        fulfilmentStatus: get("fulfilmentStatus"),
        priority: get("priority"),
        sourceSystem: get("sourceSystem"),
        assignedUserId: get("assignedUserId"),
      },
      skip: 0,
      limit: MAX_EXPORT_ROWS + 1,
    });
    if (items.length > MAX_EXPORT_ROWS) {
      throw new PermissionError(
        `Export exceeds the maximum of ${MAX_EXPORT_ROWS} leads. Narrow your filters and try again.`
      );
    }
    leads = items;
  }

  const dynamicHeaders = new Set<string>();
  for (const lead of leads) {
    if (!lead) continue;
    for (const field of lead.formFieldValues ?? []) {
      if (!field.sensitive) {
        dynamicHeaders.add(field.label);
      }
    }
  }

  const headers = [...BASE_HEADERS, ...Array.from(dynamicHeaders).sort()];
  const rows: string[][] = [];

  for (const lead of leads) {
    if (!lead) continue;
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
      SALES_STATUS_LABELS[lead.salesStatus],
      FULFILMENT_STATUS_LABELS[lead.fulfilmentStatus],
      LEAD_PRIORITY_LABELS[lead.priority],
      assignee?.name ?? "",
      lead.leadValue !== undefined ? String(lead.leadValue) : "",
      lead.currency,
      lead.nextFollowUpAt?.toISOString() ?? "",
      lead.createdAt.toISOString(),
    ];

    rows.push([
      ...baseRow,
      ...Array.from(dynamicHeaders).map((label) => customMap.get(label) ?? ""),
    ]);
  }

  return toCsv(headers, rows);
}
