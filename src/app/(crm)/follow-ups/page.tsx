import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { FollowUpsViewTabs } from "@/components/follow-ups/follow-ups-view-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompleteFollowUpButton } from "@/components/follow-ups/complete-follow-up-button";
import { requireSession } from "@/lib/auth";
import { FOLLOW_UP_METHOD_LABELS } from "@/lib/constants";
import { canManageFollowUps } from "@/lib/permissions";
import { getFollowUpsPage } from "@/services/follow-ups.service";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const params = await searchParams;

  if (!params.view) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const resolved = Array.isArray(value) ? value[0] : value;
      if (resolved) next.set(key, resolved);
    }
    next.set("view", "my");
    redirect(`/follow-ups?${next.toString()}`);
  }

  const data = await getFollowUpsPage(user, params);
  const websiteId =
    typeof params.websiteId === "string" ? params.websiteId : undefined;
  const view = data.view ?? "my";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Follow-ups" }]} />
      <PageHeader
        title="Follow-ups"
        description="Pending and overdue follow-ups. Overdue status is calculated dynamically."
      />

      <FollowUpsViewTabs currentView={view} />

      <form className="mb-4 flex flex-wrap gap-2">
        {view ? <input type="hidden" name="view" value={view} /> : null}
        <select
          name="websiteId"
          defaultValue={websiteId ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All websites</option>
          {data.websites.map((website) => (
            <option key={website._id.toHexString()} value={website._id.toHexString()}>
              {website.name}
            </option>
          ))}
        </select>
        <Button type="submit">Filter</Button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState
          title="No follow-ups"
          description="Schedule follow-ups from a lead detail page."
          actionLabel="Browse leads"
          actionHref="/leads"
        />
      ) : (
        <>
          <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface-elevated)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Website</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.followUp._id.toHexString()}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      {item.contact?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      {item.lead ? (
                        <Link
                          href={`/leads/${item.lead._id.toHexString()}`}
                          className="font-medium hover:underline"
                        >
                          {item.lead.leadNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{item.website?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {FOLLOW_UP_METHOD_LABELS[item.followUp.method]}
                    </td>
                    <td className="px-4 py-3">
                      {format(item.followUp.scheduledAt, "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      {item.assignedUser?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.followUp.status === "overdue"
                            ? "danger"
                            : item.followUp.status === "completed"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {item.followUp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canManageFollowUps(user.role) &&
                      item.followUp.status !== "completed" &&
                      item.followUp.status !== "cancelled" ? (
                        <CompleteFollowUpButton
                          followUpId={item.followUp._id.toHexString()}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={data.page}
            totalPages={data.totalPages}
            basePath="/follow-ups"
            searchParams={{
              view,
              ...(websiteId ? { websiteId } : {}),
            }}
          />
        </>
      )}
    </div>
  );
}
