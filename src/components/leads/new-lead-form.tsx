"use client";

import { useActionState, useMemo, useState } from "react";
import { createManualLeadAction, type ActionResult } from "@/app/actions";
import {
  DynamicFormField,
  getActiveSortedFields,
} from "@/components/forms/dynamic-form-field";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import type { FormFieldDefinition } from "@/types/form";

const initial: ActionResult = { success: false, message: "" };

export interface ManualLeadFormOption {
  id: string;
  name: string;
  code: string;
  schemaMode: "legacy" | "dynamic";
  fields: FormFieldDefinition[];
}

export interface ManualLeadWebsiteOption {
  id: string;
  name: string;
  forms: ManualLeadFormOption[];
}

export function NewLeadForm({
  websites,
  users,
}: {
  websites: ManualLeadWebsiteOption[];
  users: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createManualLeadAction, initial);
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [formId, setFormId] = useState("");

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === websiteId),
    [websiteId, websites]
  );

  const selectedForm = useMemo(() => {
    if (!selectedWebsite) {
      return undefined;
    }
    if (formId) {
      return selectedWebsite.forms.find((form) => form.id === formId);
    }
    return selectedWebsite.forms[0];
  }, [formId, selectedWebsite]);

  const activeFields = useMemo(
    () => (selectedForm ? getActiveSortedFields(selectedForm.fields) : []),
    [selectedForm]
  );

  const useDynamicForm =
    Boolean(selectedForm) &&
    selectedForm?.schemaMode === "dynamic" &&
    activeFields.length > 0;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Leads", href: "/leads" },
          { label: "New lead" },
        ]}
      />
      <PageHeader
        title="Create lead"
        description="Select a website and form. Fields are rendered from the form schema when available."
      />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form action={action} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="websiteId">Website</Label>
                <select
                  id="websiteId"
                  name="websiteId"
                  required
                  value={websiteId}
                  onChange={(event) => {
                    setWebsiteId(event.target.value);
                    setFormId("");
                  }}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="">Select website</option>
                  {websites.map((website) => (
                    <option key={website.id} value={website.id}>
                      {website.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWebsite && selectedWebsite.forms.length > 0 ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="formId">Form</Label>
                  <select
                    id="formId"
                    name="formId"
                    required={useDynamicForm}
                    value={formId || selectedWebsite.forms[0]?.id || ""}
                    onChange={(event) => setFormId(event.target.value)}
                    className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                  >
                    {selectedWebsite.forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name} ({form.code})
                        {form.schemaMode === "legacy" ? " — legacy" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {useDynamicForm && selectedForm ? (
              <div className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="text-sm font-medium text-[var(--ink)]">
                  Form fields — {selectedForm.name}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeFields.map((field) => (
                    <div
                      key={field.id}
                      className={
                        field.fieldType === "textarea" ? "sm:col-span-2" : ""
                      }
                    >
                      <DynamicFormField field={field} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Input id="service" name="service" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" name="whatsapp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={4} />
                </div>
              </div>
            )}

            <div className="space-y-4 border border-[var(--border)] p-4">
              <h3 className="text-sm font-medium text-[var(--ink)]">
                CRM management
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    required
                    defaultValue="new"
                    className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                  >
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {LEAD_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="normal"
                    className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                  >
                    {LEAD_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {LEAD_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedUserId">Assignee</Label>
                  <select
                    id="assignedUserId"
                    name="assignedUserId"
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
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" name="currency" defaultValue="INR" maxLength={3} />
                </div>
              </div>
            </div>

            {state && !state.success && state.message ? (
              <p className="text-sm text-[var(--danger)]">{state.message}</p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create lead"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
