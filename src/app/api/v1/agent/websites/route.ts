import {
  apiSuccess,
  readAgentJsonBody,
  withAgentScope,
  ApiError,
} from "@/lib/agent-route";
import { agentHasScope } from "@/lib/agent-auth";
import { createWebsiteSchema } from "@/lib/validation/website.schema";
import {
  createWebsiteForUser,
  getAccessibleWebsites,
} from "@/services/websites.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAgentScope(request, "websites:read", async ({ sessionUser }) => {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const websites = await getAccessibleWebsites(sessionUser);
    const filtered = includeInactive
      ? websites
      : websites.filter((w) => w.isActive);
    return apiSuccess({ websites: filtered });
  });
}

export async function POST(request: Request) {
  return withAgentScope(
    request,
    "websites:write",
    async ({ agent, sessionUser }) => {
      if (!agentHasScope(agent, "websites:all")) {
        throw new ApiError(
          403,
          "AGENT_SCOPE_DENIED",
          "Creating websites requires the websites:all scope."
        );
      }
      const body = await readAgentJsonBody(request);
      const parsed = createWebsiteSchema.parse(body);
      const result = await createWebsiteForUser(sessionUser, parsed);
      return apiSuccess(
        {
          website: result.website,
          apiKey: result.apiKey,
          warning: "Store the website API key now; it will not be shown again.",
        },
        201
      );
    }
  );
}
