import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { ShareAdminActions } from "@/components/performance/share-admin-actions";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { formatDateTimeIST } from "@/lib/datetime";
import { getAppUrl } from "@/lib/env";
import { canCreateDashboardShare } from "@/lib/permissions";
import {
  canUserManageShare,
  getShareForAdmin,
} from "@/services/dashboard-shares.service";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function DashboardShareDetailPage({
  params,
}: {
  params: Promise<{ websiteId: string; shareId: string }>;
}) {
  const user = await requireSession();
  if (!canCreateDashboardShare(user.role)) {
    redirect("/dashboard");
  }

  const { websiteId, shareId } = await params;
  const website = await getWebsiteForUser(user, websiteId);

  let share;
  try {
    share = await getShareForAdmin(user, shareId);
  } catch {
    notFound();
  }

  const canRevokeOrDelete = await canUserManageShare(user, share);
  const shareUrl = `${getAppUrl()}/dashboard-share/${share.shareSlug}`;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: website.name, href: `/websites/${websiteId}` },
          { label: "Shares", href: `/websites/${websiteId}/performance/shares` },
          { label: share.name },
        ]}
      />
      <PageHeader title={share.name} description={share.title} />

      <div className="mb-4 flex flex-wrap items-center gap-3 border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <code className="break-all text-sm">{shareUrl}</code>
        <CopyButton value={shareUrl} label="Copy link" />
        <Button asChild variant="outline" size="sm">
          <Link href={shareUrl} target="_blank">
            Open shared page
          </Link>
        </Button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs text-[var(--ink-muted)]">Status</p>
          <p className="font-medium">{share.status}</p>
        </div>
        <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs text-[var(--ink-muted)]">Views</p>
          <p className="font-medium">{share.viewCount}</p>
        </div>
        <div className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs text-[var(--ink-muted)]">Last viewed</p>
          <p className="font-medium">
            {share.lastViewedAt
              ? formatDateTimeIST(share.lastViewedAt)
              : "—"}
          </p>
        </div>
      </div>

      <ShareAdminActions
        shareId={shareId}
        websiteId={websiteId}
        status={share.status}
        canRevokeOrDelete={canRevokeOrDelete}
      />
    </div>
  );
}
