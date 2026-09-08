import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getAuthSecret } from "@/lib/env";
import { getDb } from "@/lib/mongodb";

export interface RateLimitRecord {
  _id: ObjectId;
  keyHash: string;
  scope: string;
  windowStartedAt: Date;
  requestCount: number;
  blockedUntil?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: Date;
}

export interface ConsumeRateLimitOptions {
  scope: string;
  identifier: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

function hashRateLimitKey(scope: string, identifier: string): string {
  return createHash("sha256")
    .update(`${getAuthSecret()}:${scope}:${identifier}`)
    .digest("hex");
}

export async function consumeRateLimit(
  options: ConsumeRateLimitOptions
): Promise<RateLimitResult> {
  const db = await getDb();
  const collection = db.collection<RateLimitRecord>(COLLECTIONS.rateLimitRecords);
  const now = new Date();
  const keyHash = hashRateLimitKey(options.scope, options.identifier);
  const windowStart = new Date(now.getTime() - options.windowMs);
  const expiresAt = new Date(now.getTime() + options.windowMs + 60_000);
  const blockUntil = new Date(
    now.getTime() + (options.blockDurationMs ?? options.windowMs)
  );

  const existing = await collection.findOne({ keyHash, scope: options.scope });

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: existing.blockedUntil,
    };
  }

  const inActiveWindow =
    existing &&
    existing.windowStartedAt >= windowStart &&
    (!existing.blockedUntil || existing.blockedUntil <= now);

  if (inActiveWindow) {
    const updated = await collection.findOneAndUpdate(
      {
        _id: existing._id,
        requestCount: { $lt: options.maxRequests },
        windowStartedAt: { $gte: windowStart },
      },
      {
        $inc: { requestCount: 1 },
        $set: { expiresAt, updatedAt: now },
        $unset: { blockedUntil: "" },
      },
      { returnDocument: "after" }
    );

    if (updated) {
      return {
        allowed: true,
        remaining: Math.max(0, options.maxRequests - updated.requestCount),
      };
    }

    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          blockedUntil: blockUntil,
          expiresAt,
          updatedAt: now,
        },
      }
    );

    return {
      allowed: false,
      remaining: 0,
      retryAfter: blockUntil,
    };
  }

  await collection.updateOne(
    { keyHash, scope: options.scope },
    {
      $set: {
        keyHash,
        scope: options.scope,
        windowStartedAt: now,
        requestCount: 1,
        expiresAt,
        updatedAt: now,
      },
      $unset: { blockedUntil: "" },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return {
    allowed: true,
    remaining: Math.max(0, options.maxRequests - 1),
  };
}

export function hashPrivacySafeIdentifier(value: string): string {
  return createHash("sha256")
    .update(`${getAuthSecret()}:identifier:${value.trim().toLowerCase()}`)
    .digest("hex");
}
