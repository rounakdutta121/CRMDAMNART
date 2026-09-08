import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { createServiceSchema } from "@/lib/validation/service.schema";
import {
  createServiceForUser,
  getServicesForUser,
} from "@/services/services.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAgentScope(request, "services:read", async ({ sessionUser }) => {
    const url = new URL(request.url);
    const websiteId = url.searchParams.get("websiteId") ?? undefined;
    const services = await getServicesForUser(sessionUser, { websiteId });
    return apiSuccess({ services });
  });
}

export async function POST(request: Request) {
  return withAgentScope(request, "services:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = createServiceSchema.parse(body);
    const service = await createServiceForUser(sessionUser, parsed);
    return apiSuccess({ service }, 201);
  });
}
