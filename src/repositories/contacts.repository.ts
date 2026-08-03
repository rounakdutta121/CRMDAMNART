import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { Contact } from "@/types/contact";

const ACTIVE_CONTACT_FILTER: Filter<Contact> = {
  $or: [{ isMerged: { $exists: false } }, { isMerged: false }],
};

export async function findContactById(id: string): Promise<Contact | null> {
  const db = await getDb();
  return db
    .collection<Contact>(COLLECTIONS.contacts)
    .findOne({ _id: new ObjectId(id) });
}

export async function findContactsByIds(
  ids: string[]
): Promise<Map<string, Contact>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const db = await getDb();
  const contacts = await db
    .collection<Contact>(COLLECTIONS.contacts)
    .find({ _id: { $in: uniqueIds.map((id) => new ObjectId(id)) } })
    .toArray();

  return new Map(
    contacts.map((contact) => [contact._id.toHexString(), contact])
  );
}

export async function findPossibleContact(options: {
  normalizedEmail?: string;
  normalizedPhone?: string;
}): Promise<Contact | null> {
  const db = await getDb();
  const or: Filter<Contact>[] = [];

  if (options.normalizedEmail) {
    or.push({ normalizedEmail: options.normalizedEmail });
  }
  if (options.normalizedPhone) {
    or.push({ normalizedPhone: options.normalizedPhone });
  }

  if (or.length === 0) {
    return null;
  }

  return db.collection<Contact>(COLLECTIONS.contacts).findOne({
    $and: [ACTIVE_CONTACT_FILTER, { $or: or }],
  });
}

export async function findDuplicateContacts(options: {
  contactId?: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  company?: string;
  excludeContactId?: string;
}): Promise<Contact[]> {
  const db = await getDb();
  let normalizedEmail = options.normalizedEmail;
  let normalizedPhone = options.normalizedPhone;
  let company = options.company;

  if (options.contactId) {
    const contact = await findContactById(options.contactId);
    if (!contact) {
      return [];
    }
    normalizedEmail = contact.normalizedEmail;
    normalizedPhone = contact.normalizedPhone;
    company = contact.company;
  }

  const or: Filter<Contact>[] = [];

  if (normalizedEmail) {
    or.push({ normalizedEmail });
  }

  if (normalizedPhone) {
    or.push({ normalizedPhone });
  }

  if (normalizedEmail && company) {
    or.push({ normalizedEmail, company });
  }

  if (normalizedPhone && company) {
    or.push({ normalizedPhone, company });
  }

  if (or.length === 0) {
    return [];
  }

  const filter: Filter<Contact> = {
    $and: [ACTIVE_CONTACT_FILTER, { $or: or }],
  };

  if (options.excludeContactId) {
    filter._id = { $ne: new ObjectId(options.excludeContactId) };
  } else if (options.contactId) {
    filter._id = { $ne: new ObjectId(options.contactId) };
  }

  return db
    .collection<Contact>(COLLECTIONS.contacts)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
}

export async function findContactsExcludingMerged(options: {
  search?: string;
  skip: number;
  limit: number;
}): Promise<{ items: Contact[]; total: number }> {
  const db = await getDb();
  const conditions: Filter<Contact>[] = [ACTIVE_CONTACT_FILTER];

  if (options.search) {
    const regex = new RegExp(
      options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    conditions.push({
      $or: [
        { name: regex },
        { email: regex },
        { phone: regex },
        { company: regex },
        { searchName: regex },
        { searchCompany: regex },
      ],
    });
  }

  const filter: Filter<Contact> =
    conditions.length === 1 ? conditions[0]! : { $and: conditions };

  const [items, total] = await Promise.all([
    db
      .collection<Contact>(COLLECTIONS.contacts)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db.collection<Contact>(COLLECTIONS.contacts).countDocuments(filter),
  ]);

  return { items, total };
}

export async function createContact(
  data: Omit<Contact, "_id">
): Promise<Contact> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: Contact = { ...data, _id };
  await db.collection<Contact>(COLLECTIONS.contacts).insertOne(doc);
  return doc;
}

export async function updateContact(
  id: string,
  update: Partial<Omit<Contact, "_id" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  await db.collection<Contact>(COLLECTIONS.contacts).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function deleteContactById(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Contact>(COLLECTIONS.contacts).deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export async function markContactMerged(options: {
  secondaryContactId: string;
  primaryContactId: string;
  mergedByUserId: string;
  preservedFields?: Partial<
    Pick<
      Contact,
      | "name"
      | "email"
      | "normalizedEmail"
      | "phone"
      | "normalizedPhone"
      | "whatsapp"
      | "company"
      | "country"
      | "state"
      | "city"
      | "searchName"
      | "searchCompany"
    >
  >;
}): Promise<void> {
  const db = await getDb();
  const now = new Date();

  await db.collection<Contact>(COLLECTIONS.contacts).updateOne(
    { _id: new ObjectId(options.secondaryContactId) },
    {
      $set: {
        isMerged: true,
        mergedIntoContactId: new ObjectId(options.primaryContactId),
        mergedAt: now,
        mergedByUserId: new ObjectId(options.mergedByUserId),
        updatedAt: now,
      },
    }
  );

  if (options.preservedFields && Object.keys(options.preservedFields).length > 0) {
    await db.collection<Contact>(COLLECTIONS.contacts).updateOne(
      { _id: new ObjectId(options.primaryContactId) },
      {
        $set: {
          ...options.preservedFields,
          updatedAt: now,
        },
      }
    );
  }
}

export async function listContacts(options: {
  search?: string;
  skip: number;
  limit: number;
  includeMerged?: boolean;
}): Promise<{ items: Contact[]; total: number }> {
  if (!options.includeMerged) {
    return findContactsExcludingMerged(options);
  }

  const db = await getDb();
  const filter: Filter<Contact> = {};

  if (options.search) {
    const regex = new RegExp(
      options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { company: regex },
      { searchName: regex },
      { searchCompany: regex },
    ];
  }

  const [items, total] = await Promise.all([
    db
      .collection<Contact>(COLLECTIONS.contacts)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db.collection<Contact>(COLLECTIONS.contacts).countDocuments(filter),
  ]);

  return { items, total };
}
