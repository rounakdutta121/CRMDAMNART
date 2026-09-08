import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { createManualLeadSchema } from "@/lib/validation/lead.schema";
import { createManualLead, getLeadsPage } from "@/services/leads.service";

export const runtime = "nodejs";

function toSearchParams(request: Request): Record<string, string> {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export async function GET(request: Request) {
  return withAgentScope(request, "leads:read", async ({ sessionUser }) => {
    const page = await getLeadsPage(sessionUser, toSearchParams(request));
    return apiSuccess(page);
  });
}

export async function POST(request: Request) {
  return withAgentScope(request, "leads:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = createManualLeadSchema.parse(body);
    const lead = await createManualLead(sessionUser, parsed, {
      sourceSystem: "agent",
    });
    return apiSuccess({ lead }, 201);
  });
}
