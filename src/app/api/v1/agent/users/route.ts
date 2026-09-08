import { ApiError, apiSuccess, readAgentJsonBody, withAgentScope } from "@/lib/agent-route";
import { agentHasScope } from "@/lib/agent-auth";
import { createUserSchema } from "@/lib/validation/user.schema";
import {
  createUserForAdmin,
  getUsersForAdmin,
} from "@/services/users.service";
import type { UserRole } from "@/types/auth";

export const runtime = "nodejs";

const AGENT_ALLOWED_ROLES: UserRole[] = [
  "sales_manager",
  "sales_executive",
  "operations",
  "marketing",
  "viewer",
];

export async function GET(request: Request) {
  return withAgentScope(request, "users:read", async ({ sessionUser }) => {
    const users = await getUsersForAdmin(sessionUser);
    return apiSuccess({ users });
  });
}

export async function POST(request: Request) {
  return withAgentScope(
    request,
    "users:write",
    async ({ agent, sessionUser }) => {
      const body = await readAgentJsonBody(request);
      const parsed = createUserSchema.parse(body);

      if (!AGENT_ALLOWED_ROLES.includes(parsed.role as UserRole)) {
        throw new ApiError(
          403,
          "PERMISSION_DENIED",
          "Agents cannot create admin or super_admin users."
        );
      }

      let permittedWebsiteIds = parsed.permittedWebsiteIds ?? [];
      if (!agentHasScope(agent, "websites:all")) {
        const allowlist = new Set(sessionUser.permittedWebsiteIds);
        permittedWebsiteIds = permittedWebsiteIds.filter((id) =>
          allowlist.has(id)
        );
        if (permittedWebsiteIds.length === 0) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "permittedWebsiteIds must include at least one website the agent can access."
          );
        }
      }

      const user = await createUserForAdmin(sessionUser, {
        ...parsed,
        permittedWebsiteIds,
      });
      return apiSuccess({ user }, 201);
    }
  );
}
