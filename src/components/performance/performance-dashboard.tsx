"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArchivePanel, ReportSection } from "@/components/shared/archive";
import type { WebsitePerformanceAggregate } from "@/services/website-performance.service";

function MetricBlock({
  label,
  metric,
}: {
  label: string;
  metric?: { value: number; changeLabel?: string };
}) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
      <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">{label}</p>
      <p className="mt-1 font-editorial text-2xl font-semibold tabular-nums text-[var(--ink)]">
        {metric ? Math.round(metric.value * 100) / 100 : 0}
      </p>
      {metric?.changeLabel ? (
        <p className="mt-1 text-xs text-[var(--ink-muted)]">{metric.changeLabel}</p>
      ) : null}
    </div>
  );
}

const METRIC_LABELS: Record<string, string> = {
  total_leads: "Total leads",
  qualified_leads: "Qualified",
  converted_leads: "Converted",
  conversion_rate: "Conversion rate",
  unassigned_leads: "Unassigned",
  gclid_capture_rate: "GCLID capture rate",
};

const GRID = "#d4cdc0";
const MUTED = "#5c564c";

export function PerformanceDashboard({
  data,
  branding,
}: {
  data: WebsitePerformanceAggregate;
  branding?: {
    displayName?: string;
    primaryColor?: string;
    showDamnArtBranding?: boolean;
  };
}) {
  const accent = branding?.primaryColor ?? "#3d4a36";

  return (
    <div className="space-y-8">
      <ReportSection number="01 / Executive summary" title="Key metrics">
        <div className="grid gap-px border border-[var(--border-strong)] bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(data.metrics).map(([key, metric]) => (
            <MetricBlock
              key={key}
              label={METRIC_LABELS[key] ?? key}
              metric={metric}
            />
          ))}
        </div>
      </ReportSection>

      {data.charts.leadsOverTime.length > 0 ? (
        <ArchivePanel>
          <ReportSection number="02 / Capture trend" title="Leads over time">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.leadsOverTime}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: MUTED }}
                    axisLine={{ stroke: GRID }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: MUTED }}
                    axisLine={{ stroke: GRID }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#faf8f4",
                      border: `1px solid ${GRID}`,
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={accent}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ReportSection>
        </ArchivePanel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {data.charts.byStatus.length > 0 ? (
          <ArchivePanel>
            <ReportSection number="03 / Pipeline" title="Status breakdown">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.byStatus} layout="vertical">
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={100}
                      tick={{ fontSize: 11, fill: MUTED }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#faf8f4",
                        border: `1px solid ${GRID}`,
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill={accent} radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportSection>
          </ArchivePanel>
        ) : null}

        {data.tables.bySource.length > 0 ? (
          <ArchivePanel>
            <ReportSection number="04 / Sources" title="Source analysis">
              <div className="ledger-scroll">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.bySource.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td className="font-mono-id text-xs">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>
          </ArchivePanel>
        ) : null}
      </div>

      {branding?.showDamnArtBranding !== false ? (
        <p className="text-center font-meta text-[0.625rem] text-[var(--ink-subtle)]">
          Prepared with DamnArt CRM
        </p>
      ) : null}
    </div>
  );
}
