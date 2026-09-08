import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { exportLeadsToCsv } from "@/services/export-leads.service";
import { PermissionError } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();

    const params = request.nextUrl.searchParams;
    const idsParam = params.get("ids");
    const leadIds = idsParam
      ? idsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : undefined;

    const filters: Record<string, string | undefined> = {};
    for (const key of [
      "websiteId",
      "service",
      "status",
      "priority",
      "sourceSystem",
      "assignedUserId",
      "search",
      "view",
    ]) {
      const value = params.get(key);
      if (value) {
        filters[key] = value;
      }
    }

    const csv = await exportLeadsToCsv(user, {
      leadIds,
      filters: leadIds ? undefined : filters,
    });

    const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 403 }
      );
    }
    if (
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" ||
        error.message === "SESSION_INVALIDATED")
    ) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized." } },
        { status: 401 }
      );
    }
    console.error("[export/leads]", error);
    return NextResponse.json(
      { success: false, error: { message: "Export failed." } },
      { status: 500 }
    );
  }
}
