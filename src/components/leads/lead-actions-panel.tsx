"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  addNoteAction,
  contactAttemptAction,
  scheduleFollowUpAction,
  updateContactAction,
  updateLeadAction,
  type ActionResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOW_UP_METHODS,
  FOLLOW_UP_METHOD_LABELS,
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
} from "@/types/lead";

const initial: ActionResult = { success: false, message: "" };

export interface LeadActionsLead {
  id: string;
  websiteId: string;
  service?: string;
  serviceCategory?: string;
  formName?: string;
  message?: string;
  salesStatus: SalesStatus;
  fulfilmentStatus: FulfilmentStatus;
  priority: LeadPriority;
  leadValue?: number;
  currency: string;
  assignedUserId?: string;
  lostReason?: string;
}

export interface LeadActionsContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface LeadActionsUser {
  id: string;
  name: string;
}

function useActionToast(state: ActionResult | undefined) {
  useEffect(() => {
    if (!state?.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

export function LeadActionsPanel({
  lead,
  contact,
  users,
  canEdit,
  canNote,
  canSales,
  canFulfilment,
  canAssign,
}: {
  lead: LeadActionsLead;
  contact: LeadActionsContact;
  users: LeadActionsUser[];
  canEdit: boolean;
  canNote: boolean;
  canSales: boolean;
  canFulfilment: boolean;
  canAssign: boolean;
}) {
  const leadId = lead.id;
  const updateLead = updateLeadAction.bind(null, leadId);
  const updateContact = updateContactAction.bind(
    null,
    contact.id,
    leadId,
    lead.websiteId
  );
  const addNote = addNoteAction.bind(null, leadId);
  const contactAttempt = contactAttemptAction.bind(null, leadId);
  const schedule = scheduleFollowUpAction.bind(null, leadId);

  const [leadState, leadAction, leadPending] = useActionState(updateLead, initial);
  const [contactState, contactAction, contactPending] = useActionState(
    updateContact,
    initial
  );
  const [noteState, noteAction, notePending] = useActionState(addNote, initial);
  const [attemptState, attemptAction, attemptPending] = useActionState(
    contactAttempt,
    initial
  );
  const [followState, followAction, followPending] = useActionState(
    schedule,
    initial
  );

  useActionToast(leadState);
  useActionToast(contactState);
  useActionToast(noteState);
  useActionToast(attemptState);
  useActionToast(followState);

  return (
    <div className="space-y-6">
      {canEdit ? (
        <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Update contact
          </h3>
          <form action={contactAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" name="name" defaultValue={contact.name} required />
            <Field label="Email" name="email" defaultValue={contact.email ?? ""} />
            <Field label="Phone" name="phone" defaultValue={contact.phone ?? ""} />
            <Field
              label="WhatsApp"
              name="whatsapp"
              defaultValue={contact.whatsapp ?? ""}
            />
            <Field
              label="Company"
              name="company"
              defaultValue={contact.company ?? ""}
            />
            <Field
              label="Job title"
              name="jobTitle"
              defaultValue={contact.jobTitle ?? ""}
            />
            <Field
              label="Country"
              name="country"
              defaultValue={contact.country ?? ""}
            />
            <Field label="State" name="state" defaultValue={contact.state ?? ""} />
            <Field label="City" name="city" defaultValue={contact.city ?? ""} />
            <div className="sm:col-span-2">
              <Button type="submit" disabled={contactPending}>
                {contactPending ? "Saving…" : "Save contact"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {canEdit || canSales || canFulfilment || canAssign ? (
        <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Update lead
          </h3>
          <form action={leadAction} className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Service"
              name="service"
              defaultValue={lead.service ?? ""}
            />
            <Field
              label="Service category"
              name="serviceCategory"
              defaultValue={lead.serviceCategory ?? ""}
            />
            <Field
              label="Form name"
              name="formName"
              defaultValue={lead.formName ?? ""}
            />
            <Field
              label="Lead value"
              name="leadValue"
              type="number"
              defaultValue={
                lead.leadValue !== undefined ? String(lead.leadValue) : ""
              }
            />
            <Field
              label="Currency"
              name="currency"
              defaultValue={lead.currency}
            />
            {canAssign ? (
              <div className="space-y-1">
                <Label htmlFor="assignedUserId">Assignee</Label>
                <select
                  id="assignedUserId"
                  name="assignedUserId"
                  defaultValue={lead.assignedUserId ?? ""}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {canSales ? (
              <div className="space-y-1">
                <Label htmlFor="salesStatus">Sales status</Label>
                <select
                  id="salesStatus"
                  name="salesStatus"
                  defaultValue={lead.salesStatus}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  {SALES_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SALES_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {canFulfilment ? (
              <div className="space-y-1">
                <Label htmlFor="fulfilmentStatus">Fulfilment status</Label>
                <select
                  id="fulfilmentStatus"
                  name="fulfilmentStatus"
                  defaultValue={lead.fulfilmentStatus}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  {FULFILMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {FULFILMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                defaultValue={lead.priority}
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
              >
                {LEAD_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {LEAD_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Lost reason"
              name="lostReason"
              defaultValue={lead.lostReason ?? ""}
            />
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                defaultValue={lead.message ?? ""}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={leadPending}>
                {leadPending ? "Saving…" : "Save lead"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {canNote ? (
        <>
          <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Add note</h3>
            <form action={noteAction} className="space-y-3">
              <Textarea id="note" name="note" required rows={3} />
              <Button type="submit" disabled={notePending}>
                {notePending ? "Saving…" : "Add note"}
              </Button>
            </form>
          </section>

          <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
              Log contact attempt
            </h3>
            <form action={attemptAction} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  name="method"
                  defaultValue="call"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  {FOLLOW_UP_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {FOLLOW_UP_METHOD_LABELS[method]}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea id="note" name="note" rows={2} placeholder="Optional note" />
              <Button type="submit" disabled={attemptPending}>
                {attemptPending ? "Saving…" : "Log attempt"}
              </Button>
            </form>
          </section>

          <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
              Schedule follow-up
            </h3>
            <form action={followAction} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="follow-method">Method</Label>
                  <select
                    id="follow-method"
                    name="method"
                    defaultValue="call"
                    className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                  >
                    {FOLLOW_UP_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {FOLLOW_UP_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scheduledAt">Scheduled at</Label>
                  <Input
                    id="scheduledAt"
                    name="scheduledAt"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="follow-assignedUserId">Assignee</Label>
                  <select
                    id="follow-assignedUserId"
                    name="assignedUserId"
                    className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                  >
                    <option value="">Me</option>
                    {users.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Textarea id="note" name="note" rows={2} placeholder="Optional note" />
              <Button type="submit" disabled={followPending}>
                {followPending ? "Scheduling…" : "Schedule follow-up"}
              </Button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}
