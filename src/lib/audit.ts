import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { AuditEntityType, AuditLog } from "@/types/audit-log";

export interface CreateAuditLogInput {
  actingUserId?: string;
  actingSystem?: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string | ObjectId;
  websiteId?: string | ObjectId;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

function sanitizeValues(
  values?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!values) {
    return undefined;
  }

  const sensitive = new Set([
    "password",
    "passwordHash",
    "apiKey",
    "apiKeyHash",
    "token",
    "authorization",
    "secret",
  ]);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (sensitive.has(key)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export async function writeAuditLog(input: CreateAuditLogInput): Promise<void> {
  const db = await getDb();
  const entityId =
    typeof input.entityId === "string"
      ? new ObjectId(input.entityId)
      : input.entityId;

  const doc: Omit<AuditLog, "_id"> = {
    action: input.action,
    entityType: input.entityType,
    entityId,
    createdAt: new Date(),
    previousValues: sanitizeValues(input.previousValues),
    newValues: sanitizeValues(input.newValues),
  };

  if (input.actingUserId) {
    doc.actingUserId = new ObjectId(input.actingUserId);
  }
  if (input.actingSystem) {
    doc.actingSystem = input.actingSystem;
  }
  if (input.websiteId) {
    doc.websiteId =
      typeof input.websiteId === "string"
        ? new ObjectId(input.websiteId)
        : input.websiteId;
  }

  await db.collection(COLLECTIONS.auditLogs).insertOne(doc);
}
