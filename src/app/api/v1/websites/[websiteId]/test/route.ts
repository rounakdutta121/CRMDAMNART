import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { apiErrorResponse, apiSuccess, ApiError } from "@/lib/api-auth";
import { canManageWebsites, canAccessWebsite } from "@/lib/permissions";
import { testWebsiteWebhookAccess } from "@/services/webhook.service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ websiteId: string }> }
) {
  try {
    let user;
    try {
      user = await requireSession();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "UNAUTHORIZED" ||
          error.message === "SESSION_INVALIDATED")
      ) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
      }
      throw error;
    }

    if (!canManageWebsites(user.role)) {
      throw new ApiError(403, "FORBIDDEN", "Insufficient permissions.");
    }

    const { websiteId } = await context.params;
    if (!canAccessWebsite(user, websiteId)) {
      throw new ApiError(403, "FORBIDDEN", "Website access denied.");
    }

    const data = await testWebsiteWebhookAccess(websiteId);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
