import { ObjectId, type Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type {
  IntegrationLog,
  IntegrationLogStatus,
} from "@/types/integration-log";

export interface IntegrationLogListFilters {
  websiteId?: string;
  formId?: string;
  integrationType?: IntegrationLog["integrationType"];
  status?: IntegrationLogStatus;
  dateFrom?: Date;
  dateTo?: Date;
  externalSubmissionId?: string;
  idempotencyKey?: string;
  testSubmission?: boolean;
}

function buildIntegrationLogFilter(
  filters: IntegrationLogListFilters
): Filter<IntegrationLog> {
  const filter: Filter<IntegrationLog> = {};

  if (filters.websiteId) {
    filter.websiteId = new ObjectId(filters.websiteId);
  }

  if (filters.formId) {
    filter.formId = new ObjectId(filters.formId);
  }

  if (filters.integrationType) {
    filter.integrationType = filters.integrationType;
  }

  if (filters.status) {
    filter.status = filters.status;
  }

  if (filters.externalSubmissionId) {
    filter.externalSubmissionId = filters.externalSubmissionId;
  }

  if (filters.idempotencyKey) {
    filter.idempotencyKey = filters.idempotencyKey;
  }

  if (filters.testSubmission !== undefined) {
    filter.testSubmission = filters.testSubmission;
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

  return filter;
}

export async function createIntegrationLog(
  data: Omit<IntegrationLog, "_id">
): Promise<IntegrationLog> {
  const db = await getDb();
  const _id = new ObjectId();
  const doc: IntegrationLog = { ...data, _id };
  await db
    .collection<IntegrationLog>(COLLECTIONS.integrationLogs)
    .insertOne(doc);
  return doc;
}

export async function findIntegrationLogById(
  id: string
): Promise<IntegrationLog | null> {
  const db = await getDb();
  return db
    .collection<IntegrationLog>(COLLECTIONS.integrationLogs)
    .findOne({ _id: new ObjectId(id) });
}

export async function listIntegrationLogs(options: {
  filters: IntegrationLogListFilters;
  skip: number;
  limit: number;
}): Promise<{ items: IntegrationLog[]; total: number }> {
  const db = await getDb();
  const filter = buildIntegrationLogFilter(options.filters);

  const [items, total] = await Promise.all([
    db
      .collection<IntegrationLog>(COLLECTIONS.integrationLogs)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db
      .collection<IntegrationLog>(COLLECTIONS.integrationLogs)
      .countDocuments(filter),
  ]);

  return { items, total };
}
