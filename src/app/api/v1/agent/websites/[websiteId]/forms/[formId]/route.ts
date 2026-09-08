import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { updateFormSchema } from "@/lib/validation/form.schema";
import {
  deactivateFormForUser,
  getFormForUser,
  updateFormForUser,
} from "@/services/forms.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ websiteId: string; formId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { formId } = await context.params;
  return withAgentScope(request, "forms:read", async ({ sessionUser }) => {
    const form = await getFormForUser(sessionUser, formId);
    return apiSuccess({ form });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { formId } = await context.params;
  return withAgentScope(request, "forms:write", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = updateFormSchema.parse(body);
    const form = await updateFormForUser(sessionUser, formId, parsed);
    return apiSuccess({ form });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { formId } = await context.params;
  return withAgentScope(request, "forms:delete", async ({ sessionUser }) => {
    await deactivateFormForUser(sessionUser, formId);
    return apiSuccess({ deactivated: true, formId });
  });
}
