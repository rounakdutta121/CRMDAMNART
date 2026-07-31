import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import {
  canMergeContacts,
  PermissionError,
} from "@/lib/permissions";
import type { MergeContactsInput } from "@/lib/validation/import.schema";
import { createActivity } from "@/repositories/activities.repository";
import {
  findContactById,
  markContactMerged,
  updateContact,
} from "@/repositories/contacts.repository";
import {
  listLeads,
  reassignLeadsToContact,
} from "@/repositories/leads.repository";
import type { SessionUser } from "@/types/auth";
import type { Contact } from "@/types/contact";

function pickPreservedFields(
  primary: Contact,
  secondary: Contact,
  preserveFrom: "primary" | "secondary"
): Partial<Contact> {
  const source = preserveFrom === "secondary" ? secondary : primary;
  return {
    name: source.name,
    email: source.email,
    normalizedEmail: source.normalizedEmail,
    phone: source.phone,
    normalizedPhone: source.normalizedPhone,
    whatsapp: source.whatsapp,
    company: source.company,
    country: source.country,
    state: source.state,
    city: source.city,
    searchName: source.searchName,
    searchCompany: source.searchCompany,
  };
}

export async function mergeContactsForUser(
  user: SessionUser,
  input: MergeContactsInput
): Promise<{ primaryContactId: string; mergedLeadCount: number }> {
  if (!canMergeContacts(user.role)) {
    throw new PermissionError("You are not allowed to merge contacts.");
  }

  if (input.primaryContactId === input.secondaryContactId) {
    throw new Error("Primary and secondary contacts must be different.");
  }

  const [primary, secondary] = await Promise.all([
    findContactById(input.primaryContactId),
    findContactById(input.secondaryContactId),
  ]);

  if (!primary || !secondary) {
    throw new Error("One or both contacts were not found.");
  }

  if (primary.isMerged || secondary.isMerged) {
    throw new Error("Merged contacts cannot be merged again.");
  }

  const preservedFields = pickPreservedFields(
    primary,
    secondary,
    input.preserveFrom
  );

  await updateContact(input.primaryContactId, preservedFields);
  await markContactMerged({
    secondaryContactId: input.secondaryContactId,
    primaryContactId: input.primaryContactId,
    mergedByUserId: user.id,
    preservedFields,
  });

  const mergedLeadCount = await reassignLeadsToContact(
    input.secondaryContactId,
    input.primaryContactId
  );

  const { items: primaryLeads } = await listLeads({
    filters: { contactIds: [new ObjectId(input.primaryContactId)] },
    skip: 0,
    limit: 200,
  });

  for (const lead of primaryLeads) {
    await createActivity({
      leadId: lead._id,
      contactId: lead.contactId,
      websiteId: lead.websiteId,
      type: "lead_updated",
      description: "Contact record merged into primary contact.",
      createdByUserId: new ObjectId(user.id),
      createdAt: new Date(),
      metadata: {
        mergedContactId: input.secondaryContactId,
      },
    });
  }

  await writeAuditLog({
    actingUserId: user.id,
    action: "contact.merged",
    entityType: "contact",
    entityId: input.primaryContactId,
    previousValues: {
      secondaryContactId: input.secondaryContactId,
    },
    newValues: {
      mergedLeadCount,
      preserveFrom: input.preserveFrom,
    },
  });

  return {
    primaryContactId: input.primaryContactId,
    mergedLeadCount,
  };
}
