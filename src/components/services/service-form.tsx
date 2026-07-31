"use client";

import { useActionState } from "react";
import {
  createServiceAction,
  updateServiceAction,
  type ActionResult,
} from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionResult = { success: false, message: "" };

export interface ServiceFormData {
  id?: string;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  websiteIds: string[];
  defaultLeadValue?: number;
  defaultCurrency: string;
  defaultLeadOwnerId?: string;
  isActive: boolean;
}

export function ServiceForm({
  service,
  websites,
  users,
  mode,
}: {
  service?: ServiceFormData;
  websites: { id: string; name: string }[];
  users: { id: string; name: string }[];
  mode: "create" | "edit";
}) {
  const action =
    mode === "create"
      ? createServiceAction
      : updateServiceAction.bind(null, service!.id!);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div>
      <GlobalLoadingSync pending={pending} />
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Services", href: "/settings/services" },
          ...(mode === "edit" && service?.id
            ? [
                {
                  label: service.name,
                  href: `/settings/services/${service.id}`,
                },
                { label: "Edit" },
              ]
            : [{ label: "New service" }]),
        ]}
      />
      <PageHeader
        title={mode === "create" ? "Create service" : `Edit ${service?.name}`}
        description="Services can be linked to websites and used as defaults on forms."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={service?.name ?? ""}
                />
              </div>
              {mode === "create" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" name="code" required placeholder="ai-automation" />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={service?.category ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default currency</Label>
                <Input
                  id="defaultCurrency"
                  name="defaultCurrency"
                  defaultValue={service?.defaultCurrency ?? "INR"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLeadOwnerId">Default lead owner</Label>
                <select
                  id="defaultLeadOwnerId"
                  name="defaultLeadOwnerId"
                  defaultValue={service?.defaultLeadOwnerId ?? ""}
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={service?.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={service?.isActive === false ? "false" : "true"}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Linked websites</Label>
              <div className="grid gap-2 rounded-md border border-[var(--border)] p-3 sm:grid-cols-2">
                {websites.map((website) => (
                  <label
                    key={website.id}
                    className="flex items-center gap-2 text-sm text-[var(--ink)]"
                  >
                    <input
                      type="checkbox"
                      name="websiteIds"
                      value={website.id}
                      defaultChecked={service?.websiteIds.includes(website.id)}
                      className="rounded border-[var(--border-strong)]"
                    />
                    {website.name}
                  </label>
                ))}
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
              {pending ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
