import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { updateServiceSchema } from "@/lib/validation/service.schema";
import {
  deleteServiceForUser,
  getServiceForUser,
  updateServiceForUser,
} from "@/services/services.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ serviceId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { serviceId } = await context.params;
  return withAgentScope(request, "services:read", async ({ sessionUser }) => {
    const service = await getServiceForUser(sessionUser, serviceId);
    return apiSuccess({ service });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { serviceId } = await context.params;
  return withAgentScope(request, "services:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = updateServiceSchema.parse(body);
    const service = await updateServiceForUser(sessionUser, serviceId, parsed);
    return apiSuccess({ service });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { serviceId } = await context.params;
  return withAgentScope(request, "services:write", async ({ sessionUser }) => {
    await deleteServiceForUser(sessionUser, serviceId);
    return apiSuccess({ deleted: true, serviceId });
  });
}
