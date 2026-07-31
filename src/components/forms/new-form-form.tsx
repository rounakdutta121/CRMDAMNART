"use client";

import { useActionState } from "react";
import { createFormAction, type ActionResult } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FORM_TEMPLATE_IDS,
  FORM_TEMPLATE_LABELS,
} from "@/lib/form-templates";

const initial: ActionResult = { success: false, message: "" };

export function NewFormForm({
  websiteId,
  websiteName,
  services,
  users,
}: {
  websiteId: string;
  websiteName: string;
  services: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const action = createFormAction.bind(null, websiteId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div>
      <GlobalLoadingSync pending={pending} />
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: websiteName, href: `/websites/${websiteId}` },
          { label: "Forms", href: `/websites/${websiteId}/forms` },
          { label: "New form" },
        ]}
      />
      <PageHeader
        title="Create form"
        description="Choose a template to pre-fill field mappings, then refine in the field builder."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" required placeholder="contact-enquiry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateId">Template</Label>
                <select
                  id="templateId"
                  name="templateId"
                  defaultValue="basic_contact"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  {FORM_TEMPLATE_IDS.map((templateId) => (
                    <option key={templateId} value={templateId}>
                      {FORM_TEMPLATE_LABELS[templateId]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pageUrl">Page URL</Label>
                <Input
                  id="pageUrl"
                  name="pageUrl"
                  placeholder="https://example.com/contact"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultServiceId">Default service</Label>
                <select
                  id="defaultServiceId"
                  name="defaultServiceId"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="">None</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLeadOwnerId">Default lead owner</Label>
                <select
                  id="defaultLeadOwnerId"
                  name="defaultLeadOwnerId"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactIdentityRule">Contact identity</Label>
                <select
                  id="contactIdentityRule"
                  name="contactIdentityRule"
                  defaultValue="email_or_phone"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="email_or_phone">Email or phone</option>
                  <option value="email_required">Email required</option>
                  <option value="phone_required">Phone required</option>
                  <option value="email_and_phone">Email and phone</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unknownFieldPolicy">Unknown fields</Label>
                <select
                  id="unknownFieldPolicy"
                  name="unknownFieldPolicy"
                  defaultValue="ignore"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="ignore">Ignore</option>
                  <option value="record_field_names">Record field names</option>
                  <option value="reject">Reject submission</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attributionEnabled">Attribution</Label>
                <select
                  id="attributionEnabled"
                  name="attributionEnabled"
                  defaultValue="true"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue="true"
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {state?.message ? (
              <p
                className={`text-sm ${state.success ? "text-emerald-600" : "text-[var(--danger)]"}`}
              >
                {state.message}
              </p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create form"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
