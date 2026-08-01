import { cookies } from "next/headers";
import { PerformanceDashboard } from "@/components/performance/performance-dashboard";
import { PublicShareLeadsTable } from "@/components/performance/public-share-leads-table";
import { DashboardSharePasswordGate } from "@/components/performance/dashboard-share-password-gate";
import { formatDateTimeIST } from "@/lib/datetime";
import { getDashboardAccessCookieName } from "@/lib/share-access-cookie";
import { parsePagination } from "@/lib/pagination";
import {
  getPublicShareDashboardData,
  getPublicShareLeadDetails,
} from "@/services/dashboard-shares.service";

export const metadata = {
  robots: "noindex,nofollow",
};

export const dynamic = "force-dynamic";

const SHARE_LEADS_PAGE_SIZE = 10;

export default async function PublicDashboardSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ shareSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { shareSlug } = await params;
  const query = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(getDashboardAccessCookieName())?.value;

  const result = await getPublicShareDashboardData(shareSlug, accessToken);

  if (!result.ok) {
    if (result.requiresPassword) {
      return (
        <DashboardSharePasswordGate
          shareSlug={shareSlug}
          title="Protected dashboard"
        />
      );
    }

    return (
      <div className="archive-grain flex min-h-screen items-center justify-center bg-background px-4">
        <div className="page-editorial w-full border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-8 text-center">
          <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
            Report unavailable
          </p>
          <h1 className="mt-3 font-editorial text-2xl font-semibold text-[var(--ink)]">
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            This report link is invalid, expired or has been revoked.
          </p>
        </div>
      </div>
    );
  }

  const pagination = parsePagination({
    page: query.page,
    pageSize: query.pageSize ?? String(SHARE_LEADS_PAGE_SIZE),
  });

  const leadsResult = await getPublicShareLeadDetails(
    shareSlug,
    accessToken,
    pagination
  );

  const { share, websiteName, data } = result;

  return (
    <div className="archive-grain min-h-screen bg-background">
      <header className="border-b border-[var(--border-ink)] bg-[var(--surface-ink)] text-[var(--surface-ink-fg)]">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {share.branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={share.branding.logoUrl}
                  alt={share.branding.displayName}
                  className="mb-4 h-10 w-auto brightness-0 invert"
                />
              ) : (
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center border border-[var(--surface-ink-fg)]/30 font-editorial text-lg font-bold"
                  style={{
                    backgroundColor: share.branding.primaryColor ?? "transparent",
                  }}
                >
                  {share.branding.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="font-meta text-[0.6875rem] opacity-70">
                {websiteName}
              </p>
              <h1 className="mt-2 font-editorial text-3xl font-semibold tracking-tight sm:text-4xl">
                {share.title}
              </h1>
            </div>
            <div className="text-right">
              <p className="font-meta text-[0.625rem] opacity-70">Period</p>
              <p className="font-mono-id text-sm">{data.periodLabel}</p>
              <p className="mt-3 font-meta text-[0.625rem] opacity-70">
                Refreshed
              </p>
              <p className="font-mono-id text-sm">
                {formatDateTimeIST(new Date())}
              </p>
            </div>
          </div>
          {share.branding.footerText ? (
            <p className="mt-4 text-xs opacity-70">{share.branding.footerText}</p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <p className="mb-8 border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-meta text-[0.6875rem] text-[var(--ink-muted)]">
          Confidential client report · Lead details are limited to this
          reporting period
        </p>
        <PerformanceDashboard data={data} branding={share.branding} />
        {leadsResult.ok ? (
          <div className="mt-8">
            <PublicShareLeadsTable
              leads={leadsResult.leads}
              shareSlug={shareSlug}
              pageSize={pagination.pageSize}
            />
          </div>
        ) : null}
        <footer className="mt-12 border-t border-[var(--border-strong)] pt-6 text-center">
          <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
            Restricted distribution · Intended for authorized recipients only
          </p>
        </footer>
      </main>
    </div>
  );
}
