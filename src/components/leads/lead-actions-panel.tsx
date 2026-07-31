"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateContactAction,
  updateLeadAction,
  type ActionResult,
} from "@/app/actions";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import type { LeadPriority, LeadStatus } from "@/types/lead";

const initial: ActionResult = { success: false, message: "" };

export interface LeadActionsLead {
  id: string;
  websiteId: string;
  service?: string;
  formName?: string;
  message?: string;
  status: LeadStatus;
  priority: LeadPriority;
  currency: string;
  assignedUserId?: string;
}

export interface LeadActionsContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
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
  canChangeStatus,
  canAssign,
}: {
  lead: LeadActionsLead;
  contact: LeadActionsContact;
  users: LeadActionsUser[];
  canEdit: boolean;
  canChangeStatus: boolean;
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

  const [leadState, leadAction, leadPending] = useActionState(updateLead, initial);
  const [contactState, contactAction, contactPending] = useActionState(
    updateContact,
    initial
  );

  useActionToast(leadState);
  useActionToast(contactState);

  return (
    <div className="space-y-6">
      <GlobalLoadingSync pending={leadPending || contactPending} />
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

      {canEdit || canChangeStatus || canAssign ? (
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
              label="Form name"
              name="formName"
              defaultValue={lead.formName ?? ""}
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
            {canChangeStatus ? (
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={lead.status}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {LEAD_STATUS_LABELS[status]}
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
