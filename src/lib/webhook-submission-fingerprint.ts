import { createHash } from "crypto";

const VOLATILE_KEYS = new Set([
  "submittedAt",
  "submitted_at",
  "timestamp",
  "createdAt",
  "created_at",
  "receivedAt",
  "received_at",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (isPlainObject(value)) {
    return normalizePayload(value);
  }
  return String(value);
}

function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const key of Object.keys(payload).sort()) {
    if (VOLATILE_KEYS.has(key)) {
      continue;
    }
    const value = normalizeValue(payload[key]);
    if (value !== null) {
      normalized[key] = value;
    }
  }

  return normalized;
}

export const WEBHOOK_DEDUP_WINDOW_MS = 10_000;

export function buildWebhookSubmissionFingerprint(
  websiteId: string,
  formId: string,
  payload: Record<string, unknown>
): string {
  const canonical = JSON.stringify({
    websiteId,
    formId,
    payload: normalizePayload(payload),
  });

  return createHash("sha256").update(canonical).digest("hex");
}
