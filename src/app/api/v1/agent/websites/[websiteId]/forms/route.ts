import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { createFormSchema } from "@/lib/validation/form.schema";
import {
  createFormForUser,
  getFormsForWebsite,
} from "@/services/forms.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ websiteId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  return withAgentScope(request, "forms:read", async ({ sessionUser }) => {
    const forms = await getFormsForWebsite(sessionUser, websiteId);
    return apiSuccess({ forms });
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { websiteId } = await context.params;
  return withAgentScope(request, "forms:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = createFormSchema.parse({ ...body, websiteId });
    const form = await createFormForUser(sessionUser, parsed);
    return apiSuccess({ form }, 201);
  });
}
