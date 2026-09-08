import { redirect } from "next/navigation";
import { NewAiAgentForm } from "@/components/ai-agents/new-ai-agent-form";
import { requireSession } from "@/lib/auth";
import { canManageAiAgents } from "@/lib/permissions";
import { getAccessibleWebsites } from "@/services/websites.service";

export default async function NewAiAgentPage() {
  const user = await requireSession();
  if (!canManageAiAgents(user.role)) {
    redirect("/dashboard");
  }

  const websites = await getAccessibleWebsites(user);

  return (
    <NewAiAgentForm
      websites={websites.map((w) => ({
        id: w._id.toHexString(),
        name: w.name,
      }))}
    />
  );
}
