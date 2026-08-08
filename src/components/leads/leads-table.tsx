"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  bulkLeadAction,
  updateContactAction,
  updateLeadAction,
  updateLeadGclidAction,
} from "@/app/actions";
import { MobileRecordCard } from "@/components/shared/mobile-record-card";
import { useGlobalLoading } from "@/components/shared/global-loading";
import { formatDateTimeIST } from "@/lib/datetime";
import {
  LeadStatusBadge,
  PriorityBadge,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import type { LeadPriority, LeadStatus } from "@/types/lead";

export interface SerializedLeadRow {
  id: string;
  leadNumber: string;
  contactId: string;
  websiteId: string;
  contactName: string;
  websiteName: string;
  service: string;
  phone: string;
  email: string;
  whatsapp: string;
  company: string;
  country: string;
  state: string;
  city: string;
  gclid: string;
  status: LeadStatus;
  assignedUserId: string;
  assigneeName: string;
  priority: LeadPriority;
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
  "ledger-inline-select h-8 w-full min-w-[7.5rem] cursor-pointer rounded-[var(--radius-md)] border-0 bg-transparent py-0 pl-1 pr-6 text-sm text-[var(--ink)] hover:bg-[var(--surface-muted)] focus:bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]";

const inputClass =
  "ledger-inline-input h-8 w-full min-w-[4rem] border-0 bg-transparent px-1 text-sm text-[var(--ink)] hover:bg-[var(--surface-muted)] focus:bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]";

function displayValue(value: string) {
  return value.trim() ? value : "—";
}

export function LeadsTable({
  rows,
  users,
  dynamicColumns,
  canBulk,
  canExport,
  canEdit,
  canAssign,
  filterQuery,
}: {
  rows: SerializedLeadRow[];
  users: SerializedUser[];
  dynamicColumns: DynamicColumn[];
  canBulk: boolean;
  canExport: boolean;
  canEdit: boolean;
  canAssign: boolean;
  filterQuery: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localRows, setLocalRows] = useState(rows);
  const [bulkPending, startBulkTransition] = useTransition();
  const [editPending, startEditTransition] = useTransition();
  useGlobalLoading(bulkPending || editPending);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const allSelected = localRows.length > 0 && selected.size === localRows.length;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function patchRow(id: string, patch: Partial<SerializedLeadRow>) {
    setLocalRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

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
      setSelected(new Set(localRows.map((row) => row.id)));
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

  function saveLeadFields(
    row: SerializedLeadRow,
    fields: Record<string, string>
  ) {
    startEditTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
      }
      const result = await updateLeadAction(row.id, undefined, formData);
      if (result.success) {
        toast.success(result.message ?? "Lead updated.");
      } else {
        toast.error(result.message);
        setLocalRows(rows);
      }
    });
  }

  function saveContactFields(row: SerializedLeadRow) {
    if (!row.contactId) {
      toast.error("This lead has no contact to edit.");
      return;
    }

    const original = rows.find((item) => item.id === row.id);
    if (
      original &&
      original.contactName === row.contactName &&
      original.phone === row.phone &&
      original.email === row.email
    ) {
      return;
    }

    startEditTransition(async () => {
      const formData = new FormData();
      formData.set("name", row.contactName.trim() || "Unknown");
      formData.set("email", row.email);
      formData.set("phone", row.phone);
      formData.set("whatsapp", row.whatsapp);
      formData.set("company", row.company);
      formData.set("country", row.country);
      formData.set("state", row.state);
      formData.set("city", row.city);

      const result = await updateContactAction(
        row.contactId,
        row.id,
        row.websiteId,
        undefined,
        formData
      );
      if (result.success) {
        toast.success(result.message ?? "Contact updated.");
      } else {
        toast.error(result.message);
        setLocalRows(rows);
      }
    });
  }

  function saveGclid(row: SerializedLeadRow) {
    const original = rows.find((item) => item.id === row.id);
    const gclid = row.gclid.trim();
    if (original && gclid === original.gclid) return;

    patchRow(row.id, { gclid });
    startEditTransition(async () => {
      const result = await updateLeadGclidAction(row.id, gclid);
      if (result.success) {
        toast.success(result.message ?? "GCLID updated.");
      } else {
        toast.error(result.message);
        setLocalRows(rows);
      }
    });
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
                name="status"
                className={selectClass}
                aria-label="Status"
              >
                <option value="">Status</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
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
        {localRows.map((item) => (
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
              subtitle={displayValue(item.contactName)}
              status={<LeadStatusBadge status={item.status} />}
              className={canBulk ? "pl-10" : undefined}
              meta={[
                { label: "Website", value: item.websiteName },
                { label: "Service", value: displayValue(item.service) },
                { label: "Owner", value: item.assigneeName || "Unassigned" },
                {
                  label: "Received",
                  value: formatDateTimeIST(item.createdAt),
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
              <th>Created</th>
              <th>Website</th>
              <th>Service</th>
              <th>Phone</th>
              <th>Email</th>
              {dynamicColumns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th>GCLID</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {localRows.map((item) => (
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
                <td>
                  {canEdit && item.contactId ? (
                    <input
                      className={inputClass}
                      value={item.contactName}
                      aria-label={`Contact for ${item.leadNumber}`}
                      onChange={(event) =>
                        patchRow(item.id, { contactName: event.target.value })
                      }
                      onBlur={(event) => {
                        const value = event.target.value;
                        const next = { ...item, contactName: value };
                        patchRow(item.id, { contactName: value });
                        saveContactFields(next);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    displayValue(item.contactName)
                  )}
                </td>
                <td className="font-mono-id text-xs whitespace-nowrap">
                  {formatDateTimeIST(item.createdAt)}
                </td>
                <td>{item.websiteName}</td>
                <td>
                  {canEdit ? (
                    <input
                      className={inputClass}
                      value={item.service}
                      placeholder="—"
                      aria-label={`Service for ${item.leadNumber}`}
                      onChange={(event) =>
                        patchRow(item.id, { service: event.target.value })
                      }
                      onBlur={(event) => {
                        const value = event.target.value;
                        const original = rows.find((row) => row.id === item.id);
                        if (!original || value === original.service) return;
                        saveLeadFields(item, { service: value });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    displayValue(item.service)
                  )}
                </td>
                <td>
                  {canEdit && item.contactId ? (
                    <input
                      className={`${inputClass} font-mono-id text-xs`}
                      value={item.phone}
                      placeholder="—"
                      aria-label={`Phone for ${item.leadNumber}`}
                      onChange={(event) =>
                        patchRow(item.id, { phone: event.target.value })
                      }
                      onBlur={(event) => {
                        const value = event.target.value;
                        const next = { ...item, phone: value };
                        patchRow(item.id, { phone: value });
                        saveContactFields(next);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <span className="font-mono-id text-xs">
                      {displayValue(item.phone)}
                    </span>
                  )}
                </td>
                <td>
                  {canEdit && item.contactId ? (
                    <input
                      className={`${inputClass} font-mono-id text-xs`}
                      value={item.email}
                      placeholder="—"
                      aria-label={`Email for ${item.leadNumber}`}
                      onChange={(event) =>
                        patchRow(item.id, { email: event.target.value })
                      }
                      onBlur={(event) => {
                        const value = event.target.value;
                        const next = { ...item, email: value };
                        patchRow(item.id, { email: value });
                        saveContactFields(next);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <span className="font-mono-id text-xs">
                      {displayValue(item.email)}
                    </span>
                  )}
                </td>
                {dynamicColumns.map((column) => (
                  <td key={column.id}>
                    {item.dynamicValues[column.id] ?? "—"}
                  </td>
                ))}
                <td>
                  {canEdit ? (
                    <input
                      className={`${inputClass} max-w-[12rem] font-mono-id text-xs`}
                      value={item.gclid}
                      placeholder="—"
                      title={item.gclid || undefined}
                      aria-label={`GCLID for ${item.leadNumber}`}
                      onChange={(event) =>
                        patchRow(item.id, { gclid: event.target.value })
                      }
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        const next = { ...item, gclid: value };
                        patchRow(item.id, { gclid: value });
                        saveGclid(next);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="font-mono-id text-xs"
                      title={item.gclid || undefined}
                    >
                      {displayValue(item.gclid)}
                    </span>
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <select
                      className={selectClass}
                      value={item.status}
                      aria-label={`Status for ${item.leadNumber}`}
                      onChange={(event) => {
                        const status = event.target.value as LeadStatus;
                        if (status === item.status) return;
                        patchRow(item.id, { status });
                        saveLeadFields(item, { status });
                      }}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {LEAD_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <LeadStatusBadge status={item.status} />
                  )}
                </td>
                <td>
                  {canEdit && canAssign ? (
                    <select
                      className={selectClass}
                      value={item.assignedUserId}
                      aria-label={`Assignee for ${item.leadNumber}`}
                      onChange={(event) => {
                        const assignedUserId = event.target.value;
                        if (assignedUserId === item.assignedUserId) return;
                        const assigneeName =
                          users.find((user) => user.id === assignedUserId)
                            ?.name ?? "Unassigned";
                        patchRow(item.id, { assignedUserId, assigneeName });
                        saveLeadFields(item, { assignedUserId });
                      }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.assigneeName
                  )}
                </td>
                <td>
                  {canEdit ? (
                    <select
                      className={selectClass}
                      value={item.priority}
                      aria-label={`Priority for ${item.leadNumber}`}
                      onChange={(event) => {
                        const priority = event.target.value as LeadPriority;
                        if (priority === item.priority) return;
                        patchRow(item.id, { priority });
                        saveLeadFields(item, { priority });
                      }}
                    >
                      {LEAD_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {LEAD_PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <PriorityBadge priority={item.priority} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
