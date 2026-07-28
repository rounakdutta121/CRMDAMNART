import { NextRequest } from "next/server";
import { apiErrorResponse, apiSuccess } from "@/lib/api-auth";
import { handleWebhookLeadPost } from "@/lib/webhook-route";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ websiteKey: string; formCode: string }> }
) {
  try {
    const { websiteKey, formCode } = await context.params;
    const result = await handleWebhookLeadPost(request, { websiteKey, formCode });
    return apiSuccess(result, result.idempotentReplay ? 200 : 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
