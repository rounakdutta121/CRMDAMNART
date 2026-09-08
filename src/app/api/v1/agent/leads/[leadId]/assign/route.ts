import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { z } from "zod";
import { updateLeadForUser } from "@/services/leads.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ leadId: string }> };

const assignSchema = z.object({
  assignedUserId: z.string().min(1).nullable(),
});

export async function POST(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  return withAgentScope(request, "leads:assign", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = assignSchema.parse(body);
    const lead = await updateLeadForUser(sessionUser, leadId, {
      assignedUserId: parsed.assignedUserId ?? "",
    });
    return apiSuccess({ lead });
  });
}
