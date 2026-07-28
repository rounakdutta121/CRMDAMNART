import {
  normalizeEmail,
  normalizeOptionalString,
  normalizePhone,
} from "@/lib/normalization";
import { writeAuditLog } from "@/lib/audit";
import {
  canAccessWebsite,
  canEditContacts,
  canMergeContacts,
  PermissionError,
  resolveWebsiteFilter,
} from "@/lib/permissions";
import type { MergeContactsInput } from "@/lib/validation/import.schema";
import type { UpdateContactInput } from "@/lib/validation/lead.schema";
import {
  createContact,
  findContactById,
  findDuplicateContacts,
  findPossibleContact,
  listContacts,
  markContactMerged,
  updateContact,
} from "@/repositories/contacts.repository";
import { listLeads } from "@/repositories/leads.repository";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { ObjectId } from "mongodb";
import type { SessionUser } from "@/types/auth";
import type { Contact } from "@/types/contact";
import type { Lead } from "@/types/lead";
import { buildPaginatedResult, parsePagination } from "@/lib/pagination";

export async function findOrCreateContact(input: {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  state?: string;
  city?: string;
}): Promise<{ contact: Contact; created: boolean }> {
  const email = normalizeOptionalString(input.email);
  const phone = normalizeOptionalString(input.phone);
  const normalizedEmail = email ? normalizeEmail(email) : undefined;
  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  const existing = await findPossibleContact({
    normalizedEmail,
    normalizedPhone,
  });

  if (existing) {
    return { contact: existing, created: false };
  }

  const now = new Date();
  const contact = await createContact({
    name: input.name.trim(),
    email,
    normalizedEmail,
    phone,
    normalizedPhone,
    whatsapp: normalizeOptionalString(input.whatsapp),
    company: normalizeOptionalString(input.company),
    jobTitle: normalizeOptionalString(input.jobTitle),
    country: normalizeOptionalString(input.country),
    state: normalizeOptionalString(input.state),
    city: normalizeOptionalString(input.city),
    createdAt: now,
    updatedAt: now,
  });

  return { contact, created: true };
}

export async function getContactDetail(
  user: SessionUser,
  contactId: string
): Promise<{ contact: Contact; leads: Lead[] }> {
  const contact = await findContactById(contactId);
  if (!contact) {
    throw new Error("Contact not found.");
  }

  const websiteIds = resolveWebsiteFilter(user);
  const { items: leads } = await listLeads({
    filters: {
      websiteIds,
      contactIds: [contact._id],
    },
    skip: 0,
    limit: 100,
  });

  return { contact, leads };
}

export async function getContactsPage(
  user: SessionUser,
  searchParams: Record<string, string | string[] | undefined>
) {
  void user;
  const pagination = parsePagination(searchParams);
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;

  const { items, total } = await listContacts({
    search,
    skip: pagination.skip,
    limit: pagination.limit,
  });

  return buildPaginatedResult(items, total, pagination.page, pagination.pageSize);
}

export async function updateContactForUser(
  user: SessionUser,
  contactId: string,
  input: UpdateContactInput,
  websiteIdForAudit?: string
): Promise<Contact> {
  if (!canEditContacts(user.role)) {
    throw new PermissionError("You are not allowed to edit contacts.");
  }

  const existing = await findContactById(contactId);
  if (!existing) {
    throw new Error("Contact not found.");
  }

  if (websiteIdForAudit && !canAccessWebsite(user, websiteIdForAudit)) {
    throw new PermissionError("You do not have access to this website.");
  }

  const email = normalizeOptionalString(input.email);
  const phone = normalizeOptionalString(input.phone);

  const update = {
    name: input.name.trim(),
    email,
    normalizedEmail: email ? normalizeEmail(email) : undefined,
    phone,
    normalizedPhone: phone ? normalizePhone(phone) : undefined,
    whatsapp: normalizeOptionalString(input.whatsapp),
    company: normalizeOptionalString(input.company),
    jobTitle: normalizeOptionalString(input.jobTitle),
    country: normalizeOptionalString(input.country),
    state: normalizeOptionalString(input.state),
    city: normalizeOptionalString(input.city),
  };

  await updateContact(contactId, update);

  await writeAuditLog({
    actingUserId: user.id,
    action: "contact.updated",
    entityType: "contact",
    entityId: contactId,
    websiteId: websiteIdForAudit,
    previousValues: {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
    },
    newValues: update,
  });

  const updated = await findContactById(contactId);
  if (!updated) {
    throw new Error("Contact not found after update.");
  }
  return updated;
}

export async function getDuplicateContactsPage(user: SessionUser) {
  void user;
  const { items: contacts } = await listContacts({
    skip: 0,
    limit: 500,
  });

  const duplicateGroups: Array<{
    key: string;
    contacts: Contact[];
  }> = [];
  const seen = new Set<string>();

  for (const contact of contacts) {
    const key = contact.normalizedEmail ?? contact.normalizedPhone ?? "";
    if (!key || seen.has(key)) continue;

    const duplicates = await findDuplicateContacts({
      contactId: contact._id.toHexString(),
      excludeContactId: contact._id.toHexString(),
    });

    if (duplicates.length > 0) {
      seen.add(key);
      duplicateGroups.push({
        key,
        contacts: [contact, ...duplicates],
      });
    }
  }

  return duplicateGroups.slice(0, 50);
}

export async function mergeContactsForUser(
  user: SessionUser,
  input: MergeContactsInput
): Promise<void> {
  if (!canMergeContacts(user.role)) {
    throw new PermissionError("You are not allowed to merge contacts.");
  }

  const [primary, secondary] = await Promise.all([
    findContactById(input.primaryContactId),
    findContactById(input.secondaryContactId),
  ]);

  if (!primary || !secondary) {
    throw new Error("One or both contacts were not found.");
  }

  const preserved =
    input.preserveFrom === "secondary"
      ? {
          name: secondary.name,
          email: secondary.email,
          normalizedEmail: secondary.normalizedEmail,
          phone: secondary.phone,
          normalizedPhone: secondary.normalizedPhone,
          whatsapp: secondary.whatsapp,
          company: secondary.company,
          jobTitle: secondary.jobTitle,
          country: secondary.country,
          state: secondary.state,
          city: secondary.city,
        }
      : undefined;

  await markContactMerged({
    secondaryContactId: input.secondaryContactId,
    primaryContactId: input.primaryContactId,
    mergedByUserId: user.id,
    preservedFields: preserved,
  });

  const db = await getDb();
  await db.collection(COLLECTIONS.leads).updateMany(
    { contactId: new ObjectId(input.secondaryContactId) },
    {
      $set: {
        contactId: new ObjectId(input.primaryContactId),
        updatedAt: new Date(),
      },
    }
  );

  await writeAuditLog({
    actingUserId: user.id,
    action: "contact.merged",
    entityType: "contact",
    entityId: input.primaryContactId,
    previousValues: { secondaryContactId: input.secondaryContactId },
    newValues: { primaryContactId: input.primaryContactId },
  });
}
