import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-auth";
import { MAX_WEBHOOK_BODY_BYTES } from "@/lib/constants";
import { ingestWebhookLead } from "@/services/webhook.service";

async function parseWebhookRequest(
  request: NextRequest
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  const raw = await request.text();
  if (raw.length > MAX_WEBHOOK_BODY_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  try {
    const json = JSON.parse(raw) as unknown;
    if (json === null || typeof json !== "object" || Array.isArray(json)) {
      throw new Error("Invalid JSON object.");
    }
    return json as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export async function handleWebhookLeadPost(
  request: NextRequest,
  options: { websiteKey: string; formCode?: string }
) {
  const payload = await parseWebhookRequest(request);
  const bodyFormCode =
    typeof payload.formCode === "string" ? payload.formCode : undefined;

  return ingestWebhookLead({
    websiteKey: options.websiteKey,
    formCode: options.formCode ?? bodyFormCode ?? null,
    headerFormCode: request.headers.get("x-form-code"),
    apiKey: request.headers.get("x-api-key"),
    idempotencyKey: request.headers.get("x-idempotency-key"),
    rawPayload: payload,
    endpoint: request.nextUrl.pathname,
    requestMethod: request.method,
  });
}
