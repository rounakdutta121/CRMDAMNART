"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkLeadAction } from "@/app/actions";
import { MobileRecordCard } from "@/components/shared/mobile-record-card";
import {
  FulfilmentStatusBadge,
  PriorityBadge,
  SalesStatusBadge,
  SourceBadge,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import {
  FULFILMENT_STATUSES,
  FULFILMENT_STATUS_LABELS,
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  SALES_STATUSES,
  SALES_STATUS_LABELS,
} from "@/lib/constants";
import type {
  FulfilmentStatus,
  LeadPriority,
  SalesStatus,
  SourceSystem,
} from "@/types/lead";

export interface SerializedLeadRow {
  id: string;
  leadNumber: string;
  contactName: string;
  websiteName: string;
  service: string;
  phone: string;
  email: string;
  sourceSystem: SourceSystem;
  salesStatus: SalesStatus;
  fulfilmentStatus: FulfilmentStatus;
  assigneeName: string;
  priority: LeadPriority;
  nextFollowUpAt: string | null;
  createdAt: string;
  dynamicValues: Record<string, string>;
}

export interface SerializedUser {
  id: string;
  name: string;
}

export interface DynamicColumn {
  id: string;
  label: string;
}

const selectClass =
  "h-9 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm text-[var(--ink)]";

export function LeadsTable({
  rows,
  users,
  dynamicColumns,
  canBulk,
  canExport,
  filterQuery,
}: {
  rows: SerializedLeadRow[];
  users: SerializedUser[];
  dynamicColumns: DynamicColumn[];
  canBulk: boolean;
  canExport: boolean;
  filterQuery: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPending, startBulkTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function handleBulkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startBulkTransition(async () => {
      const result = await bulkLeadAction(undefined, formData);
      if (result.success) {
        toast.success(result.message ?? "Bulk action completed.");
        setSelected(new Set());
      } else {
        toast.error(result.message);
      }
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((row) => row.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportSelected() {
    if (selectedIds.length === 0) {
      toast.error("Select at least one lead to export.");
      return;
    }
    window.location.href = `/api/v1/export/leads?ids=${encodeURIComponent(selectedIds.join(","))}`;
  }

  function exportFiltered() {
    window.location.href = `/api/v1/export/leads${filterQuery ? `?${filterQuery}` : ""}`;
  }

  return (
    <div>
      {canBulk || canExport ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
          <span className="font-meta text-[0.625rem] text-[var(--ink-muted)]">
            {selected.size} selected
          </span>

          {canBulk && selected.size > 0 ? (
            <form
              onSubmit={handleBulkSubmit}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="hidden"
                name="leadIds"
                value={JSON.stringify(selectedIds)}
              />

              <select
                name="action"
                defaultValue="assign"
                className={selectClass}
                id="bulk-action"
                aria-label="Bulk action"
              >
                <option value="assign">Assign</option>
                <option value="change_status">Change status</option>
                <option value="change_priority">Change priority</option>
                <option value="mark_spam">Mark spam</option>
              </select>

              <select
                name="assignedUserId"
                className={selectClass}
                aria-label="Assignee"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              <select
                name="salesStatus"
                className={selectClass}
                aria-label="Sales status"
              >
                <option value="">Sales status</option>
                {SALES_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SALES_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>

              <select
                name="fulfilmentStatus"
                className={selectClass}
                aria-label="Fulfilment status"
              >
                <option value="">Fulfilment status</option>
                {FULFILMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {FULFILMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>

              <select name="priority" className={selectClass} aria-label="Priority">
                <option value="">Priority</option>
                {LEAD_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {LEAD_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm" disabled={bulkPending}>
                Apply
              </Button>
            </form>
          ) : null}

          {canExport ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={exportSelected}
              >
                Export selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={exportFiltered}
              >
                Export filtered
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Mobile record cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((item) => (
          <div key={item.id} className="relative">
            {canBulk ? (
              <label className="absolute left-3 top-3 z-10">
                <span className="sr-only">Select {item.leadNumber}</span>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleOne(item.id)}
                  className="h-4 w-4"
                />
              </label>
            ) : null}
            <MobileRecordCard
              href={`/leads/${item.id}`}
              title={item.leadNumber}
              subtitle={item.contactName}
              status={<SalesStatusBadge status={item.salesStatus} />}
              className={canBulk ? "pl-10" : undefined}
              meta={[
                { label: "Website", value: item.websiteName },
                { label: "Service", value: item.service || "—" },
                { label: "Owner", value: item.assigneeName || "Unassigned" },
                {
                  label: "Received",
                  value: format(new Date(item.createdAt), "dd MMM yyyy"),
                },
              ]}
            />
          </div>
        ))}
      </div>

      {/* Desktop ledger */}
      <div className="ledger-scroll hidden border border-[var(--border-strong)] bg-[var(--surface-elevated)] md:block">
        <table className="ledger-table min-w-[960px]">
          <thead>
            <tr>
              {canBulk ? (
                <th className="sticky-col w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all leads"
                  />
                </th>
              ) : null}
              <th className={canBulk ? undefined : "sticky-col"}>Lead #</th>
              <th>Contact</th>
              <th>Website</th>
              <th>Service</th>
              <th>Phone</th>
              <th>Email</th>
              {dynamicColumns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th>Source</th>
              <th>Sales</th>
              <th>Fulfilment</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Next follow-up</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                data-selected={selected.has(item.id) ? "true" : undefined}
              >
                {canBulk ? (
                  <td className="sticky-col">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Select ${item.leadNumber}`}
                    />
                  </td>
                ) : null}
                <td className={canBulk ? undefined : "sticky-col"}>
                  <Link
                    href={`/leads/${item.id}`}
                    className="font-mono-id text-xs font-medium text-[var(--ink)] hover:underline"
                  >
                    {item.leadNumber}
                  </Link>
                </td>
                <td>{item.contactName}</td>
                <td>{item.websiteName}</td>
                <td>{item.service}</td>
                <td className="font-mono-id text-xs">{item.phone}</td>
                <td className="font-mono-id text-xs">{item.email}</td>
                {dynamicColumns.map((column) => (
                  <td key={column.id}>
                    {item.dynamicValues[column.id] ?? "—"}
                  </td>
                ))}
                <td>
                  <SourceBadge source={item.sourceSystem} />
                </td>
                <td>
                  <SalesStatusBadge status={item.salesStatus} />
                </td>
                <td>
                  <FulfilmentStatusBadge status={item.fulfilmentStatus} />
                </td>
                <td>{item.assigneeName}</td>
                <td>
                  <PriorityBadge priority={item.priority} />
                </td>
                <td className="font-mono-id text-xs">
                  {item.nextFollowUpAt
                    ? format(new Date(item.nextFollowUpAt), "dd MMM yyyy")
                    : "—"}
                </td>
                <td className="font-mono-id text-xs">
                  {format(new Date(item.createdAt), "dd MMM yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
