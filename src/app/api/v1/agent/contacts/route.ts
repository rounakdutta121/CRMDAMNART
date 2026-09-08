import {
  apiSuccess,
  withAgentScope,
} from "@/lib/agent-route";
import { getContactsPage } from "@/services/contacts.service";

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
  return withAgentScope(request, "contacts:read", async ({ sessionUser }) => {
    const page = await getContactsPage(sessionUser, toSearchParams(request));
    return apiSuccess(page);
  });
}
