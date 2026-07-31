import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsViewTabs } from "@/components/leads/leads-view-tabs";
import { LeadsViewModeTabs } from "@/components/leads/leads-view-mode-tabs";
import { MonthNav } from "@/components/leads/month-nav";
import { SavedViewsDropdown } from "@/components/leads/saved-views-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  SOURCE_SYSTEMS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import {
  canCreateManualLeads,
  canExportLeads,
  canImportLeads,
  canPerformBulkActions,
} from "@/lib/permissions";
import { getLeadsPage } from "@/services/leads.service";
import { getMonthlyLeadsPage } from "@/services/monthly-leads.service";
import { getSavedViewsForUser } from "@/services/saved-views.service";
import type { LeadFormFieldValue } from "@/types/form";

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatDynamicValue(value: LeadFormFieldValue["value"]): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const viewMode = (Array.isArray(params.viewMode) ? params.viewMode[0] : params.viewMode) ?? "table";
  const useMonthly = viewMode === "monthly" || Boolean(params.month);

  const [data, monthlyData, savedViews] = await Promise.all([
    useMonthly ? Promise.resolve(null) : getLeadsPage(user, params),
    useMonthly ? getMonthlyLeadsPage(user, params) : Promise.resolve(null),
    getSavedViewsForUser(user),
  ]);

  const leadsData = data ?? {
    items: monthlyData!.items,
    view: monthlyData!.view,
    websites: monthlyData!.websites,
    forms: [],
    users: monthlyData!.users,
    dynamicColumns: [],
    page: monthlyData!.page,
    totalPages: monthlyData!.totalPages,
    total: monthlyData!.total,
  };

  const filterValues = {
    search: getParam(params, "search"),
    websiteId: getParam(params, "websiteId"),
    formId: getParam(params, "formId"),
    status: getParam(params, "status"),
    priority: getParam(params, "priority"),
    sourceSystem: getParam(params, "sourceSystem"),
    assignedUserId: getParam(params, "assignedUserId"),
    dateFrom: getParam(params, "dateFrom"),
    dateTo: getParam(params, "dateTo"),
    hasGclid: getParam(params, "hasGclid"),
    missingAttribution: getParam(params, "missingAttribution"),
    service: getParam(params, "service"),
    view: getParam(params, "view"),
    viewMode: getParam(params, "viewMode") ?? "table",
    year: getParam(params, "year"),
    month: getParam(params, "month"),
  };

  const filterQuery = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filterValues).filter(([, value]) => Boolean(value))
    ) as Record<string, string>
  ).toString();

  const serializedRows = leadsData.items.map((item) => {
    const dynamicValues: Record<string, string> = {};
    for (const column of leadsData.dynamicColumns) {
      const field = item.lead.formFieldValues?.find(
        (value) => value.fieldDefinitionId === column.id
      );
      dynamicValues[column.id] = field ? formatDynamicValue(field.value) : "";
    }

    return {
      id: item.lead._id.toHexString(),
      leadNumber: item.lead.leadNumber,
      contactName: item.contact?.name ?? "—",
      websiteName: item.website?.name ?? "—",
      service: item.lead.service ?? "—",
      phone: item.contact?.phone ?? "—",
      email: item.contact?.email ?? "—",
      sourceSystem: item.lead.sourceSystem,
      status: item.lead.status,
      assigneeName: item.assignedUser?.name ?? "Unassigned",
      priority: item.lead.priority,
      createdAt: item.lead.createdAt.toISOString(),
      dynamicValues,
    };
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Leads" }]} />
      <PageHeader
        eyebrow="Lead archive"
        title="Lead records"
        description="Server-paginated lead inbox with attribution-aware filters."
        actionLabel={canCreateManualLeads(user.role) ? "New lead" : undefined}
        actionHref={canCreateManualLeads(user.role) ? "/leads/new" : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {canImportLeads(user.role) ? (
          <Button asChild variant="outline">
            <Link href="/leads/import">Import CSV</Link>
          </Button>
        ) : null}
      </div>

      <LeadsViewTabs currentView={leadsData.view} />
      <LeadsViewModeTabs currentMode={filterValues.viewMode ?? "table"} />

      {useMonthly && monthlyData && !filterValues.month ? (
        <MonthNav
          selectedYear={monthlyData.selectedYear}
          months={monthlyData.months}
        />
      ) : null}

      {useMonthly && monthlyData && filterValues.month ? (
        <div className="mb-4 border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4">
          <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
            Monthly section
          </p>
          <h2 className="mt-1 font-editorial text-lg font-semibold text-[var(--ink)]">
            {monthlyData.months.find((m) => String(m.month) === filterValues.month)?.label ??
              `Month ${filterValues.month}`}{" "}
            — {monthlyData.total} lead records
          </h2>
        </div>
      ) : null}

      <form className="mb-4 grid gap-3 border border-[var(--border)] bg-[var(--surface-elevated)] p-4 md:grid-cols-3 xl:grid-cols-4">
        <Input
          name="search"
          placeholder="Search name, email, phone, lead #"
          defaultValue={filterValues.search}
        />
        <select
          name="websiteId"
          defaultValue={filterValues.websiteId ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All websites</option>
          {leadsData.websites.map((website) => (
            <option key={website._id.toHexString()} value={website._id.toHexString()}>
              {website.name}
            </option>
          ))}
        </select>
        {leadsData.forms.length > 0 ? (
          <select
            name="formId"
            defaultValue={filterValues.formId ?? ""}
            className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
          >
            <option value="">All forms</option>
            {leadsData.forms.map((form) => (
              <option key={form._id.toHexString()} value={form._id.toHexString()}>
                {form.name}
              </option>
            ))}
          </select>
        ) : null}
        <Input
          name="service"
          placeholder="Service"
          defaultValue={filterValues.service}
        />
        <select
          name="status"
          defaultValue={filterValues.status ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LEAD_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue={filterValues.priority ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All priorities</option>
          {LEAD_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {LEAD_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
        <select
          name="sourceSystem"
          defaultValue={filterValues.sourceSystem ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All sources</option>
          {SOURCE_SYSTEMS.map((source) => (
            <option key={source} value={source}>
              {SOURCE_SYSTEM_LABELS[source]}
            </option>
          ))}
        </select>
        <select
          name="assignedUserId"
          defaultValue={filterValues.assignedUserId ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {leadsData.users.map((assignee) => (
            <option key={assignee._id.toHexString()} value={assignee._id.toHexString()}>
              {assignee.name}
            </option>
          ))}
        </select>
        <Input
          type="date"
          name="dateFrom"
          defaultValue={filterValues.dateFrom}
          aria-label="From date"
        />
        <Input
          type="date"
          name="dateTo"
          defaultValue={filterValues.dateTo}
          aria-label="To date"
        />
        <select
          name="hasGclid"
          defaultValue={filterValues.hasGclid ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">GCLID</option>
          <option value="true">Has GCLID</option>
        </select>
        <select
          name="missingAttribution"
          defaultValue={filterValues.missingAttribution ?? ""}
          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="">Attribution</option>
          <option value="true">Missing attribution</option>
        </select>
        {filterValues.view ? (
          <input type="hidden" name="view" value={filterValues.view} />
        ) : null}
        {filterValues.viewMode ? (
          <input type="hidden" name="viewMode" value={filterValues.viewMode} />
        ) : null}
        {filterValues.year ? (
          <input type="hidden" name="year" value={filterValues.year} />
        ) : null}
        {filterValues.month ? (
          <input type="hidden" name="month" value={filterValues.month} />
        ) : null}
        <div className="flex gap-2 md:col-span-3 xl:col-span-4">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="outline">
            <Link href="/leads">Reset</Link>
          </Button>
        </div>
      </form>

      <div className="mb-4">
        <SavedViewsDropdown
          views={savedViews.map((view) => ({
            id: view._id.toHexString(),
            name: view.name,
            filters: view.filters,
            isDefault: view.isDefault,
          }))}
          currentFilters={
            Object.fromEntries(
              Object.entries(filterValues).filter(([, value]) => Boolean(value))
            ) as Record<string, string>
          }
        />
      </div>

      {(!useMonthly || filterValues.month) &&
        (leadsData.items.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="Adjust filters or create a manual lead / wait for webhook submissions."
            actionLabel={canCreateManualLeads(user.role) ? "New lead" : undefined}
            actionHref={canCreateManualLeads(user.role) ? "/leads/new" : undefined}
          />
        ) : (
          <>
            <LeadsTable
              rows={serializedRows}
              users={leadsData.users.map((assignee) => ({
                id: assignee._id.toHexString(),
                name: assignee.name,
              }))}
              dynamicColumns={leadsData.dynamicColumns}
              canBulk={canPerformBulkActions(user.role)}
              canExport={canExportLeads(user.role)}
              filterQuery={filterQuery}
            />
            <PaginationControls
              page={leadsData.page}
              totalPages={leadsData.totalPages}
              basePath="/leads"
              searchParams={
                Object.fromEntries(
                  Object.entries(filterValues).filter(([, value]) => Boolean(value))
                ) as Record<string, string>
              }
            />
          </>
        ))}
    </div>
  );
}
