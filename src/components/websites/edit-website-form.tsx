"use client";

import { useActionState } from "react";
import { updateWebsiteAction, type ActionResult } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { success: false, message: "" };

export interface EditWebsiteFormData {
  id: string;
  name: string;
  code: string;
  primaryDomain: string;
  additionalDomains: string[];
  brandName?: string;
  businessDivision?: string;
  defaultCurrency: string;
  timezone: string;
  isActive: boolean;
}

export function EditWebsiteForm({ website }: { website: EditWebsiteFormData }) {
  const action = updateWebsiteAction.bind(null, website.id);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          {
            label: website.name,
            href: `/websites/${website.id}`,
          },
          { label: "Edit" },
        ]}
      />
      <PageHeader title={`Edit ${website.name}`} />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={website.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" required defaultValue={website.code} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryDomain">Primary domain</Label>
                <Input
                  id="primaryDomain"
                  name="primaryDomain"
                  required
                  defaultValue={website.primaryDomain}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="additionalDomains">Additional domains</Label>
                <Input
                  id="additionalDomains"
                  name="additionalDomains"
                  defaultValue={website.additionalDomains.join(", ")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand name</Label>
                <Input
                  id="brandName"
                  name="brandName"
                  defaultValue={website.brandName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessDivision">Business division</Label>
                <Input
                  id="businessDivision"
                  name="businessDivision"
                  defaultValue={website.businessDivision ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Currency</Label>
                <Input
                  id="defaultCurrency"
                  name="defaultCurrency"
                  defaultValue={website.defaultCurrency}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  name="timezone"
                  defaultValue={website.timezone}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={website.isActive ? "true" : "false"}
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm"
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
