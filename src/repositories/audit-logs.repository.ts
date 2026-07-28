import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";
import type { AuditLog } from "@/types/audit-log";

export async function listAuditLogs(options: {
  skip: number;
  limit: number;
}): Promise<{ items: AuditLog[]; total: number }> {
  const db = await getDb();
  const [items, total] = await Promise.all([
    db
      .collection<AuditLog>(COLLECTIONS.auditLogs)
      .find({})
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
    db.collection<AuditLog>(COLLECTIONS.auditLogs).countDocuments({}),
  ]);

  return { items, total };
}
