import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
} from "@/lib/agent-route";
import { mergeContactsSchema } from "@/lib/validation/import.schema";
import { mergeContactsForUser } from "@/services/contacts.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAgentScope(request, "contacts:merge", async ({ sessionUser }) => {
    const body = await readAgentJsonBody(request);
    const parsed = mergeContactsSchema.parse(body);
    await mergeContactsForUser(sessionUser, parsed);
    return apiSuccess({ merged: true });
  });
}
