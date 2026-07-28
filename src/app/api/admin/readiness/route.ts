import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { getServerEnv, isProduction } from "@/lib/env";
import { ensureIndexes } from "@/lib/indexes";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["super_admin"]);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Administrator access required." },
      },
      { status: 401 }
    );
  }

  const findings: string[] = [];

  try {
    const db = await getDb();
    await db.command({ ping: 1 });

    const adminCount = await db
      .collection(COLLECTIONS.users)
      .countDocuments({ role: "super_admin", isActive: true });

    if (adminCount === 0) {
      findings.push("No active super administrator account found.");
    }

    const env = getServerEnv();
    if (isProduction() && env.AUTH_SECRET.length < 32) {
      findings.push("AUTH_SECRET should be at least 32 characters in production.");
    }

    if (isProduction() && (env.APP_URL?.includes("localhost") ?? false)) {
      findings.push("APP_URL still points to localhost in production.");
    }

    const expiredActiveShares = await db
      .collection(COLLECTIONS.dashboardShares)
      .countDocuments({
        status: "active",
        "access.expiresAt": { $lte: new Date() },
      });

    if (expiredActiveShares > 0) {
      findings.push(
        `${expiredActiveShares} dashboard share(s) are marked active but past expiry.`
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: findings.length === 0 ? "ready" : "attention_required",
        database: "connected",
        indexesManagedBy: "npm run db:indexes",
        findings,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "READINESS_CHECK_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Readiness check failed.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await requireRole(["super_admin"]);
    await ensureIndexes();
    return NextResponse.json({
      success: true,
      data: { message: "Indexes ensured successfully." },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INDEX_ENSURE_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to ensure indexes.",
        },
      },
      { status: 500 }
    );
  }
}
