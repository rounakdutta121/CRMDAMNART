import { NextRequest } from "next/server";
import { apiErrorResponse, apiSuccess } from "@/lib/api-auth";
import { handleWebhookLeadPost } from "@/lib/webhook-route";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ websiteKey: string }> }
) {
  try {
    const { websiteKey } = await context.params;
    const result = await handleWebhookLeadPost(request, { websiteKey });
    return apiSuccess(result, result.idempotentReplay ? 200 : 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
