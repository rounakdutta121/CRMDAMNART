import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { updateWebsiteSchema } from "@/lib/validation/website.schema";
import {
  deleteWebsiteForUser,
  getWebsiteForUser,
  updateWebsiteForUser,
} from "@/services/websites.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ websiteId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  return withAgentScope(request, "websites:read", async ({ sessionUser }) => {
    const website = await getWebsiteForUser(sessionUser, websiteId);
    return apiSuccess({ website });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  return withAgentScope(request, "websites:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = updateWebsiteSchema.parse(body);
    const website = await updateWebsiteForUser(sessionUser, websiteId, parsed);
    return apiSuccess({ website });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  return withAgentScope(request, "websites:delete", async ({ sessionUser }) => {
    await deleteWebsiteForUser(sessionUser, websiteId);
    return apiSuccess({ deleted: true, websiteId });
  });
}
