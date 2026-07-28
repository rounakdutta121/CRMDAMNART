import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { hashPrivacySafeIdentifier } from "@/lib/rate-limit";
import { getDb } from "@/lib/mongodb";

export interface LoginAttempt {
  _id: ObjectId;
  identifierHash: string;
  failureCount: number;
  firstFailureAt: Date;
  lastFailureAt: Date;
  blockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function getLoginPolicy(): { maxAttempts: number; blockMinutes: number } {
  const env = getServerEnv();
  return {
    maxAttempts: env.LOGIN_MAX_ATTEMPTS ?? 5,
    blockMinutes: env.LOGIN_BLOCK_MINUTES ?? 15,
  };
}

export async function checkLoginBlocked(
  email: string
): Promise<{ blocked: boolean; retryAfter?: Date }> {
  const db = await getDb();
  const identifierHash = hashPrivacySafeIdentifier(email);
  const doc = await db
    .collection<LoginAttempt>(COLLECTIONS.loginAttempts)
    .findOne({ identifierHash });

  if (!doc?.blockedUntil) {
    return { blocked: false };
  }

  if (doc.blockedUntil > new Date()) {
    return { blocked: true, retryAfter: doc.blockedUntil };
  }

  return { blocked: false };
}

export async function recordLoginFailure(email: string): Promise<void> {
  const db = await getDb();
  const { maxAttempts, blockMinutes } = getLoginPolicy();
  const now = new Date();
  const windowStart = new Date(now.getTime() - DEFAULT_WINDOW_MS);
  const identifierHash = hashPrivacySafeIdentifier(email);
  const collection = db.collection<LoginAttempt>(COLLECTIONS.loginAttempts);
  const existing = await collection.findOne({ identifierHash });

  if (!existing || existing.firstFailureAt < windowStart) {
    await collection.updateOne(
      { identifierHash },
      {
        $set: {
          identifierHash,
          failureCount: 1,
          firstFailureAt: now,
          lastFailureAt: now,
          blockedUntil: undefined,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    return;
  }

  const failureCount = existing.failureCount + 1;
  const blockedUntil =
    failureCount >= maxAttempts
      ? new Date(now.getTime() + blockMinutes * 60 * 1000)
      : undefined;

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        failureCount,
        lastFailureAt: now,
        blockedUntil,
        updatedAt: now,
      },
    }
  );
}

export async function clearLoginAttempts(email: string): Promise<void> {
  const db = await getDb();
  const identifierHash = hashPrivacySafeIdentifier(email);
  await db
    .collection<LoginAttempt>(COLLECTIONS.loginAttempts)
    .deleteOne({ identifierHash });
}
