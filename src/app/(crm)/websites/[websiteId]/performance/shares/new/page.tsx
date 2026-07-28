import { redirect } from "next/navigation";
import { NewDashboardShareForm } from "@/components/performance/new-dashboard-share-form";
import { requireSession } from "@/lib/auth";
import { canCreateDashboardShare } from "@/lib/permissions";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function NewDashboardSharePage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const user = await requireSession();
  if (!canCreateDashboardShare(user.role)) {
    redirect("/dashboard");
  }

  const { websiteId } = await params;
  const website = await getWebsiteForUser(user, websiteId);

  return (
    <NewDashboardShareForm websiteId={websiteId} websiteName={website.name} />
  );
}
