import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";
import { PerformancePeriodSelector } from "@/components/performance/performance-period-selector";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { canCreateDashboardShare, canViewWebsitePerformance } from "@/lib/permissions";
import { getWebsitePerformancePage } from "@/services/website-performance.service";
import { redirect } from "next/navigation";

export default async function WebsitePerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  if (!canViewWebsitePerformance(user.role)) {
    redirect("/dashboard");
  }

  const { websiteId } = await params;
  const query = await searchParams;

  let pageData;
  try {
    pageData = await getWebsitePerformancePage(user, websiteId, query);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: pageData.website.name, href: `/websites/${websiteId}` },
          { label: "Performance" },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Website performance"
          description={`${pageData.period.label} · ${pageData.data.periodLabel}`}
        />
        <div className="flex flex-wrap gap-2">
          {canCreateDashboardShare(user.role) ? (
            <Button asChild variant="outline">
              <Link href={`/websites/${websiteId}/performance/shares`}>
                Share dashboards
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/websites/${websiteId}/team`}>Team</Link>
          </Button>
        </div>
      </div>

      <PerformancePeriodSelector current={pageData.preset} />
      <PerformanceDashboard data={pageData.data} />
    </div>
  );
}
