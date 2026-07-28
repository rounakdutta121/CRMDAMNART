import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { SalesStatusBadge } from "@/components/shared/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getWebsiteDashboardData } from "@/services/website-dashboard.service";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[var(--ink-muted)]">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-[var(--ink)]">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function WebsiteDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const { websiteId } = await params;
  const query = await searchParams;

  let data;
  try {
    data = await getWebsiteDashboardData(user, websiteId, query);
  } catch {
    notFound();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: data.website.name, href: `/websites/${websiteId}` },
          { label: "Dashboard" },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={`${data.website.name} dashboard`}
          description={`Pipeline metrics for ${data.website.primaryDomain}`}
        />
        <Button asChild variant="outline">
          <Link href={`/websites/${websiteId}`}>Website settings</Link>
        </Button>
      </div>

      <form className="mb-6 flex flex-wrap gap-2">
        <input type="date" name="dateFrom" className="h-10 rounded-md border border-[var(--border)] px-3 text-sm" />
        <input type="date" name="dateTo" className="h-10 rounded-md border border-[var(--border)] px-3 text-sm" />
        <Button type="submit">Apply</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={data.stats.totalLeads} />
        <StatCard label="New today" value={data.stats.newLeadsToday} />
        <StatCard label="Unassigned" value={data.stats.unassignedLeads} />
        <StatCard label="Follow-ups due today" value={data.stats.followUpsDueToday} />
        <StatCard label="Overdue follow-ups" value={data.stats.overdueFollowUps} />
        <StatCard label="Qualified" value={data.stats.qualifiedLeads} />
        <StatCard label="Converted" value={data.stats.convertedLeads} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.byStatus.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span>{row.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.bySource.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span>{row.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentLeads.map((item) => (
              <Link
                key={item.lead._id.toHexString()}
                href={`/leads/${item.lead._id.toHexString()}`}
                className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface)]"
              >
                <div>
                  <p className="text-sm font-medium">{item.contactName}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{item.lead.leadNumber}</p>
                </div>
                <SalesStatusBadge status={item.lead.salesStatus} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingFollowUps.map((item) => (
              <div
                key={item.followUp._id.toHexString()}
                className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.contactName}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{item.followUp.method}</p>
                </div>
                <p className="text-xs text-[var(--ink-muted)]">
                  {format(item.followUp.scheduledAt, "dd MMM yyyy HH:mm")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
