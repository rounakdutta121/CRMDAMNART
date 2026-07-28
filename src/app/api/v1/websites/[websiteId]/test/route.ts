import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiErrorResponse, apiSuccess, ApiError } from "@/lib/api-auth";
import { canManageWebsites, canAccessWebsite } from "@/lib/permissions";
import { testWebsiteWebhookAccess } from "@/services/webhook.service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ websiteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (!canManageWebsites(session.user.role)) {
      throw new ApiError(403, "FORBIDDEN", "Insufficient permissions.");
    }

    const { websiteId } = await context.params;
    if (!canAccessWebsite(session.user, websiteId) && session.user.role !== "super_admin") {
      throw new ApiError(403, "FORBIDDEN", "Website access denied.");
    }

    const data = await testWebsiteWebhookAccess(websiteId);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
