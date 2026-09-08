import { NextResponse } from "next/server";
import { PermissionError } from "@/lib/permissions";
import {
  requireAgentAuth,
  requireAgentScope,
  requireAnyAgentScope,
  type AuthenticatedAgent,
} from "@/lib/agent-auth";
import { apiErrorResponse, ApiError, apiSuccess } from "@/lib/api-auth";
import { MAX_WEBHOOK_BODY_BYTES } from "@/lib/constants";
import type { AiAgentScope } from "@/types/ai-agent";
import type { SessionUser } from "@/types/auth";

export const agentRouteRuntime = "nodejs" as const;

export type AgentContext = {
  agent: AuthenticatedAgent;
  sessionUser: SessionUser;
};

export async function withAgentAuth(
  request: Request,
  handler: (ctx: AgentContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const ctx = await requireAgentAuth(request);
    return await handler(ctx);
  } catch (error) {
    if (error instanceof PermissionError) {
      return apiErrorResponse(
        new ApiError(403, "PERMISSION_DENIED", error.message)
      );
    }
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not found")) {
        return apiErrorResponse(new ApiError(404, "NOT_FOUND", error.message));
      }
    }
    return apiErrorResponse(error);
  }
}

export async function withAgentScope(
  request: Request,
  scope: AiAgentScope,
  handler: (ctx: AgentContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAgentAuth(request, async (ctx) => {
    requireAgentScope(ctx.agent, scope);
    return handler(ctx);
  });
}

export async function withAnyAgentScope(
  request: Request,
  scopes: AiAgentScope[],
  handler: (ctx: AgentContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAgentAuth(request, async (ctx) => {
    requireAnyAgentScope(ctx.agent, scopes);
    return handler(ctx);
  });
}

export async function readAgentJsonBody(
  request: Request
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  const raw = await request.text();
  if (raw.length > MAX_WEBHOOK_BODY_BYTES) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  if (!raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ApiError(400, "INVALID_JSON", "Body must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Invalid JSON body.");
  }
}

export { apiSuccess, ApiError };
