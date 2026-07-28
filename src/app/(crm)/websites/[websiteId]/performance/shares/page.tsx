import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { canCreateDashboardShare } from "@/lib/permissions";
import { listSharesForWebsite } from "@/services/dashboard-shares.service";
import { getWebsiteForUser } from "@/services/websites.service";
import { DASHBOARD_PERIOD_LABELS } from "@/lib/constants";

export default async function DashboardSharesPage({
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
  const shares = await listSharesForWebsite(user, websiteId);
  const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: website.name, href: `/websites/${websiteId}` },
          { label: "Performance", href: `/websites/${websiteId}/performance` },
          { label: "Shares" },
        ]}
      />
      <PageHeader
        title="Share dashboards"
        description="Manage public aggregate reporting links."
        actionLabel="New share"
        actionHref={`/websites/${websiteId}/performance/shares/new`}
      />

      <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {shares.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                  No shares yet.
                </td>
              </tr>
            ) : (
              shares.map((share) => {
                const shareUrl = `${appUrl}/dashboard-share/${share.shareSlug}`;
                return (
                  <tr key={share._id.toHexString()} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/websites/${websiteId}/performance/shares/${share._id.toHexString()}`}
                        className="font-medium hover:underline"
                      >
                        {share.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {DASHBOARD_PERIOD_LABELS[share.periodPreset]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={share.status === "active" ? "success" : "secondary"}>
                        {share.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{share.viewCount}</td>
                    <td className="px-4 py-3">
                      <CopyButton value={shareUrl} label="Copy" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
