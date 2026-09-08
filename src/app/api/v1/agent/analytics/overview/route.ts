import {
  apiSuccess,
  withAgentScope,
} from "@/lib/agent-route";
import { getDashboardData } from "@/services/dashboard.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withAgentScope(request, "analytics:read", async ({ sessionUser }) => {
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const data = await getDashboardData(sessionUser, params);
    return apiSuccess(data);
  });
}
