import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { updateContactSchema } from "@/lib/validation/lead.schema";
import {
  getContactDetail,
  updateContactForUser,
} from "@/services/contacts.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ contactId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { contactId } = await context.params;
  return withAgentScope(request, "contacts:read", async ({ sessionUser }) => {
    const detail = await getContactDetail(sessionUser, contactId);
    return apiSuccess(detail);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { contactId } = await context.params;
  return withAgentScope(request, "contacts:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = updateContactSchema.parse(body);
    const contact = await updateContactForUser(sessionUser, contactId, parsed);
    return apiSuccess({ contact });
  });
}
