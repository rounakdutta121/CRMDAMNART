import { format } from "date-fns";
import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth";
import { canViewIntegrationLogs } from "@/lib/permissions";
import { getIntegrationLogsPage } from "@/services/integration-logs.service";
import { redirect } from "next/navigation";

export default async function IntegrationLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  if (!canViewIntegrationLogs(user.role)) {
    redirect("/settings/integrations");
  }

  const params = await searchParams;
  const data = await getIntegrationLogsPage(user, params);

  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const filterValues = {
    websiteId: get("websiteId") ?? "",
    status: get("status") ?? "",
    integrationType: get("integrationType") ?? "",
    dateFrom: get("dateFrom") ?? "",
    dateTo: get("dateTo") ?? "",
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/settings/integrations" },
          { label: "Integration logs" },
        ]}
      />
      <PageHeader
        title="Integration logs"
        description="Webhook and import submission history with status filters."
      />

      <form className="mb-4 flex flex-wrap gap-2 border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <select
          name="websiteId"
          defaultValue={filterValues.websiteId}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All websites</option>
          {data.websites.map((website) => (
            <option key={website._id.toHexString()} value={website._id.toHexString()}>
              {website.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filterValues.status}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="successful">Successful</option>
          <option value="rejected">Rejected</option>
          <option value="idempotent_replay">Idempotent replay</option>
          <option value="failed">Failed</option>
        </select>
        <select
          name="integrationType"
          defaultValue={filterValues.integrationType}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="website">Website</option>
          <option value="n8n">n8n</option>
          <option value="apps_script">Apps Script</option>
          <option value="import">Import</option>
          <option value="other">Other</option>
        </select>
        <Input type="date" name="dateFrom" defaultValue={filterValues.dateFrom} />
        <Input type="date" name="dateTo" defaultValue={filterValues.dateTo} />
        <Button type="submit">Filter</Button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState title="No logs" description="No integration events match your filters." />
      ) : (
        <>
          <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface-elevated)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(({ log, website }) => (
                  <tr key={log._id.toHexString()} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      {format(log.createdAt, "dd MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">{website?.name ?? "—"}</td>
                    <td className="px-4 py-3">{log.integrationType}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          log.status === "successful"
                            ? "success"
                            : log.status === "failed" || log.status === "rejected"
                              ? "danger"
                              : "secondary"
                        }
                      >
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{log.endpoint}</td>
                    <td className="px-4 py-3">
                      {log.leadId ? (
                        <Link
                          href={`/leads/${log.leadId.toHexString()}`}
                          className="underline"
                        >
                          View lead
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{log.safeErrorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={data.page}
            totalPages={data.totalPages}
            basePath="/settings/integrations/logs"
            searchParams={filterValues}
          />
        </>
      )}
    </div>
  );
}
