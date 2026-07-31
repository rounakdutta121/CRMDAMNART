import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { LeadAttribution } from "@/types/attribution";
// LeadAttribution used by countLeadsWithGclid
import type { Contact } from "@/types/contact";
import type { Lead } from "@/types/lead";

export interface LeadListFilters {
  websiteIds?: string[] | null;
  search?: string;
  websiteId?: string;
  formId?: string;
  service?: string;
  serviceId?: string;
  status?: string;
  priority?: string;
  sourceSystem?: string;
  assignedUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  assignedUserOnly?: string;
  includeUnassigned?: boolean;
  excludeTestLeads?: boolean;
  leadIdsWithGclid?: ObjectId[];
  leadIdsMissingAttribution?: ObjectId[];
  contactIds?: ObjectId[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildLeadFilter(filters: LeadListFilters): Filter<Lead> {
  const filter: Filter<Lead> = {};

  if (filters.websiteIds !== null && filters.websiteIds !== undefined) {
    if (filters.websiteIds.length === 0) {
      filter._id = { $in: [] };
      return filter;
    }
    filter.websiteId = {
      $in: filters.websiteIds.map((id) => new ObjectId(id)),
    };
  }

  if (filters.websiteId) {
    filter.websiteId = new ObjectId(filters.websiteId);
  }

  if (filters.formId) {
    filter.formId = new ObjectId(filters.formId);
  }

  if (filters.serviceId) {
    filter.serviceId = new ObjectId(filters.serviceId);
  }

  if (filters.service) {
    filter.service = filters.service;
  }

  if (filters.status) {
    filter.status = filters.status as Lead["status"];
  }

  if (filters.priority) {
    filter.priority = filters.priority as Lead["priority"];
  }

  if (filters.sourceSystem) {
    filter.sourceSystem = filters.sourceSystem as Lead["sourceSystem"];
  }

  if (filters.assignedUserId === "unassigned") {
    filter.assignedUserId = { $exists: false };
  } else if (filters.assignedUserId) {
    filter.assignedUserId = new ObjectId(filters.assignedUserId);
  }

  if (filters.dateFrom || filters.dateTo) {
    filter.createdAt = {};
    if (filters.dateFrom) {
      filter.createdAt.$gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      filter.createdAt.$lte = filters.dateTo;
    }
  }

  if (filters.assignedUserOnly) {
    const assignedClauses: Filter<Lead>[] = [
      { assignedUserId: new ObjectId(filters.assignedUserOnly) },
    ];
    if (filters.includeUnassigned) {
      assignedClauses.push({ assignedUserId: { $exists: false } });
    }
    filter.$and = [...(filter.$and ?? []), { $or: assignedClauses }];
  }

  if (filters.excludeTestLeads) {
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [{ isTestLead: { $exists: false } }, { isTestLead: false }],
      },
    ];
  }

  if (filters.leadIdsWithGclid) {
    filter._id = { $in: filters.leadIdsWithGclid };
  }

  if (filters.leadIdsMissingAttribution) {
    filter._id = { $nin: filters.leadIdsMissingAttribution };
  }

  if (filters.contactIds && filters.contactIds.length > 0) {
    filter.contactId = { $in: filters.contactIds };
  }

  return filter;
}

export async function findLeadById(id: string): Promise<Lead | null> {
  const db = await getDb();
  return db
    .collection<Lead>(COLLECTIONS.leads)
    .findOne({ _id: new ObjectId(id) });
}

export async function findLeadByExternalSubmission(
  websiteId: string,
  externalSubmissionId: string
): Promise<Lead | null> {
  const db = await getDb();
  return db.collection<Lead>(COLLECTIONS.leads).findOne({
    websiteId: new ObjectId(websiteId),
    externalSubmissionId,
  });
}

export async function createLead(data: Omit<Lead, "_id">): Promise<Lead> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: Lead = { ...data, _id };
  // Omit empty externalSubmissionId so unique partial indexes stay usable.
  if (doc.externalSubmissionId == null || doc.externalSubmissionId === "") {
    delete doc.externalSubmissionId;
  }
  await db.collection<Lead>(COLLECTIONS.leads).insertOne(doc);
  return doc;
}

export async function deleteLeadById(id: string): Promise<boolean> {
  const db = await getDb();
  const leadId = new ObjectId(id);
  const result = await db.collection<Lead>(COLLECTIONS.leads).deleteOne({
    _id: leadId,
  });
  return result.deletedCount === 1;
}

export async function deleteLeadRelatedRecords(leadId: string): Promise<void> {
  const db = await getDb();
  const id = new ObjectId(leadId);

  await Promise.all([
    db.collection(COLLECTIONS.leadActivities).deleteMany({ leadId: id }),
    db.collection(COLLECTIONS.leadAttributions).deleteMany({ leadId: id }),
    db
      .collection(COLLECTIONS.leadAssignmentHistory)
      .deleteMany({ leadId: id }),
    db.collection(COLLECTIONS.conversionEvents).deleteMany({ leadId: id }),
    db.collection(COLLECTIONS.webhookIdempotency).deleteMany({ leadId: id }),
  ]);
}

export async function updateLead(
  id: string,
  update: Partial<Omit<Lead, "_id" | "createdAt" | "leadNumber">>
): Promise<void> {
  const db = await getDb();
  await db.collection<Lead>(COLLECTIONS.leads).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );
}

export async function bulkUpdateLeads(
  ids: string[],
  update: Partial<Omit<Lead, "_id" | "createdAt" | "leadNumber">>
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const db = await getDb();
  const result = await db.collection<Lead>(COLLECTIONS.leads).updateMany(
    { _id: { $in: ids.map((id) => new ObjectId(id)) } },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

export async function listLeads(options: {
  filters: LeadListFilters;
  skip: number;
  limit: number;
}): Promise<{ items: Lead[]; total: number }> {
  const db = await getDb();
  const filter = buildLeadFilter(options.filters);

  const [items, total] = await Promise.all([
    db
      .collection<Lead>(COLLECTIONS.leads)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db.collection<Lead>(COLLECTIONS.leads).countDocuments(filter),
  ]);

  return { items, total };
}

export async function searchLeads(options: {
  search: string;
  filters: LeadListFilters;
  skip: number;
  limit: number;
}): Promise<{ items: Lead[]; total: number }> {
  const term = options.search.trim();
  if (!term) {
    return listLeads(options);
  }

  const db = await getDb();
  const baseFilter = buildLeadFilter(options.filters);
  const regex = new RegExp(escapeRegex(term), "i");
  const prefixRegex = new RegExp(`^${escapeRegex(term)}`, "i");
  const normalizedPhone = term.replace(/\D/g, "");
  const leadIdSets: ObjectId[][] = [];

  const directMatches = await db
    .collection<Lead>(COLLECTIONS.leads)
    .find(
      {
        ...baseFilter,
        $or: [
          { leadNumber: prefixRegex },
          { searchName: regex },
          { searchCompany: regex },
          { service: regex },
          { submittedServiceName: regex },
          { formCode: regex },
          { formName: regex },
        ],
      },
      { projection: { _id: 1 } }
    )
    .limit(500)
    .toArray();
  leadIdSets.push(directMatches.map((lead) => lead._id));

  const contactOr: Filter<Contact>[] = [
    { searchName: regex },
    { name: regex },
    { email: regex },
    { phone: regex },
    { whatsapp: regex },
    { company: regex },
    { searchCompany: regex },
  ];

  if (term.includes("@")) {
    contactOr.push({ normalizedEmail: term.toLowerCase() });
  }

  if (normalizedPhone.length >= 4) {
    contactOr.push({ normalizedPhone });
  }

  const contactMatches = await db
    .collection<Contact>(COLLECTIONS.contacts)
    .find(
      {
        $and: [
          {
            $or: [{ isMerged: { $exists: false } }, { isMerged: false }],
          },
          { $or: contactOr },
        ],
      },
      { projection: { _id: 1 } }
    )
    .limit(200)
    .toArray();

  if (contactMatches.length > 0) {
    const contactLeadMatches = await db
      .collection<Lead>(COLLECTIONS.leads)
      .find(
        {
          ...baseFilter,
          contactId: { $in: contactMatches.map((contact) => contact._id) },
        },
        { projection: { _id: 1 } }
      )
      .limit(500)
      .toArray();
    leadIdSets.push(contactLeadMatches.map((lead) => lead._id));
  }

  const attributionMatches = await db
    .collection<LeadAttribution>(COLLECTIONS.leadAttributions)
    .find(
      {
        $or: [
          { gclid: prefixRegex },
          { gbraid: prefixRegex },
          { wbraid: prefixRegex },
          { msclkid: prefixRegex },
          { fbclid: prefixRegex },
          { utmCampaign: regex },
          { utmSource: regex },
        ],
      },
      { projection: { leadId: 1 } }
    )
    .limit(200)
    .toArray();

  if (attributionMatches.length > 0) {
    leadIdSets.push(attributionMatches.map((row) => row.leadId));
  }

  if (options.filters.formId) {
    const customFieldMatches = await db
      .collection<Lead>(COLLECTIONS.leads)
      .find(
        {
          ...baseFilter,
          formFieldValues: {
            $elemMatch: {
              searchable: true,
              sensitive: { $ne: true },
              value: regex,
            },
          },
        },
        { projection: { _id: 1 } }
      )
      .limit(200)
      .toArray();
    leadIdSets.push(customFieldMatches.map((lead) => lead._id));
  }

  const uniqueIds = [
    ...new Set(leadIdSets.flat().map((id) => id.toHexString())),
  ].map((id) => new ObjectId(id));

  if (uniqueIds.length === 0) {
    return { items: [], total: 0 };
  }

  const finalFilter: Filter<Lead> = {
    ...baseFilter,
    _id: { $in: uniqueIds },
  };

  const [items, total] = await Promise.all([
    db
      .collection<Lead>(COLLECTIONS.leads)
      .find(finalFilter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db.collection<Lead>(COLLECTIONS.leads).countDocuments(finalFilter),
  ]);

  return { items, total };
}

export async function countLeads(filters: LeadListFilters): Promise<number> {
  const db = await getDb();
  return db
    .collection<Lead>(COLLECTIONS.leads)
    .countDocuments(buildLeadFilter(filters));
}

export async function reassignLeadsToContact(
  fromContactId: string,
  toContactId: string
): Promise<number> {
  const db = await getDb();
  const result = await db.collection<Lead>(COLLECTIONS.leads).updateMany(
    { contactId: new ObjectId(fromContactId) },
    {
      $set: {
        contactId: new ObjectId(toContactId),
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount;
}

export async function aggregateLeadsByField(
  field: "websiteId" | "status" | "sourceSystem",
  filters: LeadListFilters = {}
): Promise<{ key: string; count: number }[]> {
  const db = await getDb();
  const match = buildLeadFilter(filters);

  const results = await db
    .collection<Lead>(COLLECTIONS.leads)
    .aggregate<{ _id: unknown; count: number }>([
      { $match: match },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  return results.map((row) => ({
    key:
      row._id instanceof ObjectId
        ? row._id.toHexString()
        : String(row._id ?? "unknown"),
    count: row.count,
  }));
}

export async function getRecentLeads(
  filters: LeadListFilters = {},
  limit = 5
): Promise<Lead[]> {
  const db = await getDb();
  const filter = buildLeadFilter(filters);
  return db
    .collection<Lead>(COLLECTIONS.leads)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function countLeadsWithGclid(
  filters: LeadListFilters = {}
): Promise<number> {
  const db = await getDb();
  const leadFilter = buildLeadFilter(filters);
  const leadIds = await db
    .collection<Lead>(COLLECTIONS.leads)
    .find(leadFilter, { projection: { _id: 1 } })
    .limit(10_000)
    .toArray();

  if (leadIds.length === 0) {
    return 0;
  }

  return db.collection<LeadAttribution>(COLLECTIONS.leadAttributions).countDocuments({
    leadId: { $in: leadIds.map((lead) => lead._id) },
    gclid: { $exists: true, $type: "string", $ne: "" },
  });
}

export async function aggregateLeadsByMonth(
  filters: LeadListFilters,
  year: number,
  timezone = "Asia/Kolkata"
): Promise<{ monthKey: string; count: number }[]> {
  const db = await getDb();
  const match = buildLeadFilter(filters);
  match.createdAt = {
    $gte: new Date(year, 0, 1, 0, 0, 0, 0),
    $lte: new Date(year, 11, 31, 23, 59, 59, 999),
  };

  const results = await db
    .collection<Lead>(COLLECTIONS.leads)
    .aggregate<{ _id: string; count: number }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return results.map((row) => ({ monthKey: row._id, count: row.count }));
}

export async function aggregateLeadsOverTime(
  filters: LeadListFilters,
  granularity: "day" | "week" | "month",
  timezone = "Asia/Kolkata"
): Promise<{ period: string; count: number }[]> {
  const db = await getDb();
  const match = buildLeadFilter(filters);
  const format =
    granularity === "day"
      ? "%Y-%m-%d"
      : granularity === "week"
        ? "%Y-W%V"
        : "%Y-%m";

  const results = await db
    .collection<Lead>(COLLECTIONS.leads)
    .aggregate<{ _id: string; count: number }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format,
              date: "$createdAt",
              timezone,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return results.map((row) => ({ period: row._id, count: row.count }));
}

export async function listOpenLeadIdsForUser(options: {
  userId: string;
  websiteId?: string;
}): Promise<string[]> {
  const db = await getDb();
  const filter: Filter<Lead> = {
    assignedUserId: new ObjectId(options.userId),
    status: {
      $nin: ["converted", "lost", "duplicate", "spam_invalid"],
    },
  };
  if (options.websiteId) {
    filter.websiteId = new ObjectId(options.websiteId);
  }

  const leads = await db
    .collection<Lead>(COLLECTIONS.leads)
    .find(filter, { projection: { _id: 1 } })
    .toArray();

  return leads.map((lead) => lead._id.toHexString());
}
