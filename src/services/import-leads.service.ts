import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { generateLeadNumber } from "@/lib/lead-number";
import { normalizeOptionalString } from "@/lib/normalization";
import {
  assertCanAccessWebsite,
  canImportLeads,
  PermissionError,
} from "@/lib/permissions";
import type { ImportColumnMappingInput } from "@/lib/validation/import.schema";
import { createActivity } from "@/repositories/activities.repository";
import { createLead } from "@/repositories/leads.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import { findOrCreateContact } from "@/services/contacts.service";
import type { SessionUser } from "@/types/auth";
import type { LeadPriority, SalesStatus } from "@/types/lead";

function mapRow(
  row: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [csvColumn, fieldKey] of Object.entries(mappings)) {
    if (!fieldKey || fieldKey === "skip") continue;
    const value = row[csvColumn]?.trim();
    if (value) {
      mapped[fieldKey] = value;
    }
  }
  return mapped;
}

export async function importLeadsFromMappedRows(
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
      const mapped = mapRow(input.rows[index], input.mappings);
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
        jobTitle: mapped.jobTitle,
        country: mapped.country,
        state: mapped.state,
        city: mapped.city,
      });

      const now = new Date();
      const leadNumber = await generateLeadNumber(now.getFullYear());
      const leadValue = mapped.leadValue
        ? Number.parseFloat(mapped.leadValue)
        : undefined;

      const lead = await createLead({
        leadNumber,
        contactId: contact._id,
        websiteId: website._id,
        sourceSystem: "import",
        service,
        serviceCategory: normalizeOptionalString(mapped.serviceCategory),
        message: normalizeOptionalString(mapped.message),
        assignedUserId: website.defaultLeadOwnerId,
        salesStatus: (mapped.salesStatus as SalesStatus) ?? input.defaultSalesStatus,
        fulfilmentStatus: "not_started",
        priority: (mapped.priority as LeadPriority) ?? input.defaultPriority,
        leadValue: Number.isFinite(leadValue) ? leadValue : undefined,
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
