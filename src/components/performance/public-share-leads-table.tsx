import { format } from "date-fns";
import { ArchivePanel, ReportSection } from "@/components/shared/archive";
import { PaginationControls } from "@/components/shared/pagination-controls";
import type { PublicShareLeadRow } from "@/services/dashboard-shares.service";
import type { PaginatedResult } from "@/lib/pagination";

export function PublicShareLeadsTable({
  leads,
  shareSlug,
  pageSize,
}: {
  leads: PaginatedResult<PublicShareLeadRow>;
  shareSlug: string;
  pageSize: number;
}) {
  const from =
    leads.total === 0 ? 0 : (leads.page - 1) * leads.pageSize + 1;
  const to = Math.min(leads.page * leads.pageSize, leads.total);

  return (
    <ArchivePanel>
      <ReportSection number="05 / Lead register" title="Lead details">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm text-[var(--ink-muted)]">
            {leads.total === 0
              ? "No leads in this period."
              : `Showing ${from}–${to} of ${leads.total} leads`}
          </p>
        </div>

        <div className="ledger-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Lead #</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Service</th>
                <th>Status</th>
                <th>Source</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-[var(--ink-muted)]">
                    No leads found for this reporting period.
                  </td>
                </tr>
              ) : (
                leads.items.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-mono-id text-xs whitespace-nowrap">
                      {lead.leadNumber}
                    </td>
                    <td>{lead.contactName}</td>
                    <td className="break-all">{lead.email}</td>
                    <td className="whitespace-nowrap">{lead.phone}</td>
                    <td>{lead.service}</td>
                    <td>{lead.status}</td>
                    <td>{lead.source}</td>
                    <td className="font-mono-id text-xs whitespace-nowrap">
                      {format(new Date(lead.createdAt), "dd MMM yyyy HH:mm")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {leads.totalPages > 1 ? (
          <PaginationControls
            page={leads.page}
            totalPages={leads.totalPages}
            basePath={`/dashboard-share/${shareSlug}`}
            searchParams={{
              pageSize: String(pageSize),
            }}
          />
        ) : null}
      </ReportSection>
    </ArchivePanel>
  );
}
