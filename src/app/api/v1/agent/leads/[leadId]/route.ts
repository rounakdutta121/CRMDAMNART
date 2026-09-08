import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { updateLeadSchema } from "@/lib/validation/lead.schema";
import {
  deleteLeadForUser,
  getLeadDetail,
  updateLeadForUser,
} from "@/services/leads.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ leadId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  return withAgentScope(request, "leads:read", async ({ sessionUser }) => {
    const detail = await getLeadDetail(sessionUser, leadId);
    return apiSuccess(detail);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  return withAgentScope(request, "leads:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = updateLeadSchema.parse(body);
    const lead = await updateLeadForUser(sessionUser, leadId, parsed);
    return apiSuccess({ lead });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  return withAgentScope(request, "leads:delete", async ({ sessionUser }) => {
    await deleteLeadForUser(sessionUser, leadId);
    return apiSuccess({ deleted: true, leadId });
  });
}
