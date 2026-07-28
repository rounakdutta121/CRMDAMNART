"use client";

export interface DashboardWebsiteOption {
  id: string;
  name: string;
}

export function DashboardFilters({
  websites,
  values,
}: {
  websites: DashboardWebsiteOption[];
  values: { websiteId: string; dateFrom: string; dateTo: string };
}) {
  return (
    <form className="mb-6 flex flex-wrap items-end gap-3 border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="space-y-1">
        <label htmlFor="dashboard-website" className="text-xs font-medium text-[var(--ink-muted)]">
          Website
        </label>
        <select
          id="dashboard-website"
          name="websiteId"
          defaultValue={values.websiteId}
          className="h-10 min-w-[180px] rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All websites</option>
          {websites.map((website) => (
            <option key={website.id} value={website.id}>
              {website.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="dashboard-from" className="text-xs font-medium text-[var(--ink-muted)]">
          From
        </label>
        <input
          id="dashboard-from"
          type="date"
          name="dateFrom"
          defaultValue={values.dateFrom}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="dashboard-to" className="text-xs font-medium text-[var(--ink-muted)]">
          To
        </label>
        <input
          id="dashboard-to"
          type="date"
          name="dateTo"
          defaultValue={values.dateTo}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-fg)]"
      >
        Apply filters
      </button>
    </form>
  );
}
