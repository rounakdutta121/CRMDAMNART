import Link from "next/link";
import { format } from "date-fns";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { ArchivePanel, MetricStrip, ReportSection } from "@/components/shared/archive";
import { SalesStatusBadge } from "@/components/shared/status-badges";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboard.service";

function BarList({
  title,
  number,
  rows,
}: {
  title: string;
  number: string;
  rows: { label: string; count: number; percent: number }[];
}) {
  return (
    <ArchivePanel>
      <ReportSection number={number} title={title}>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--ink)]">{row.label}</span>
                  <span className="font-mono-id text-xs text-[var(--ink)]">
                    {row.count}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden bg-[var(--surface-muted)]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </ReportSection>
    </ArchivePanel>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const data = await getDashboardData(user, params);
  const periodLabel = format(new Date(), "dd MMM yyyy").toUpperCase();

  return (
    <div className="page-full space-y-6">
      <Breadcrumbs items={[{ label: "Command" }, { label: "Dashboard" }]} />
      <PageHeader
        eyebrow="Lead operations report"
        title="Operations desk"
        description="Live pipeline and follow-up metrics for your permitted websites."
        period={`As of ${periodLabel}`}
      />

      <DashboardFilters
        websites={data.websites.map((website) => ({
          id: website._id.toHexString(),
          name: website.name,
        }))}
        values={data.filters}
      />

      <MetricStrip
        metrics={[
          { label: "Total leads", value: data.stats.totalLeads, href: "/leads" },
          { label: "New today", value: data.stats.newLeadsToday, href: "/leads" },
          {
            label: "Unassigned",
            value: data.stats.unassignedLeads,
            href: "/leads?assignedUserId=unassigned",
          },
          {
            label: "Due today",
            value: data.stats.followUpsDueToday,
            href: "/follow-ups?status=pending",
          },
          {
            label: "Overdue",
            value: data.stats.overdueFollowUps,
            href: "/follow-ups?status=overdue",
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
        {[
          {
            label: "Qualified",
            value: data.stats.qualifiedLeads,
            href: "/leads?salesStatus=qualified",
          },
          {
            label: "Confirmed",
            value: data.stats.confirmedLeads,
            href: "/leads?salesStatus=confirmed",
          },
          {
            label: "Converted",
            value: data.stats.convertedLeads,
            href: "/leads?salesStatus=converted",
          },
          {
            label: "Lost",
            value: data.stats.lostLeads,
            href: "/leads?salesStatus=lost",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-[var(--surface-elevated)] px-4 py-3 transition-colors hover:bg-[var(--surface)]"
          >
            <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
              {item.label}
            </p>
            <p className="mt-1 font-editorial text-xl font-semibold tabular-nums">
              {item.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <BarList title="By website" number="01 / Sources" rows={data.byWebsite} />
        <BarList title="By status" number="02 / Pipeline" rows={data.byStatus} />
        <BarList title="By source" number="03 / Capture" rows={data.bySource} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ArchivePanel>
          <ReportSection number="04 / Recent" title="Recent lead records">
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">No leads yet.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.recentLeads.map((item) => (
                  <Link
                    key={item.lead._id.toHexString()}
                    href={`/leads/${item.lead._id.toHexString()}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-[var(--surface)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">
                        {item.contactName}
                      </p>
                      <p className="font-mono-id text-xs text-[var(--ink-subtle)]">
                        {item.lead.leadNumber} · {item.websiteName}
                      </p>
                    </div>
                    <SalesStatusBadge status={item.lead.salesStatus} />
                  </Link>
                ))}
              </div>
            )}
          </ReportSection>
        </ArchivePanel>

        <ArchivePanel>
          <ReportSection number="05 / Schedule" title="Upcoming follow-ups">
            {data.upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                No upcoming follow-ups.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.upcomingFollowUps.map((item) => (
                  <div
                    key={item.followUp._id.toHexString()}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">
                        {item.contactName}
                      </p>
                      <p className="text-xs text-[var(--ink-subtle)]">
                        {item.websiteName} · {item.followUp.method}
                      </p>
                    </div>
                    <p className="font-mono-id shrink-0 text-xs text-[var(--ink-muted)]">
                      {format(item.followUp.scheduledAt, "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>
        </ArchivePanel>
      </div>
    </div>
  );
}
