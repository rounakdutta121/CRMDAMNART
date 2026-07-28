"use client";

import { useActionState } from "react";
import { createUserAction, type ActionResult } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/auth";

const initial: ActionResult = { success: false, message: "" };

export function NewUserForm({
  websites,
  assignableRoles,
}: {
  websites: { id: string; name: string }[];
  assignableRoles: UserRole[];
}) {
  const [state, action, pending] = useActionState(createUserAction, initial);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users", href: "/settings/users" },
          { label: "New user" },
        ]}
      />
      <PageHeader
        title="Create user"
        description="Provision a CRM account. Public registration is disabled."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  required
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                  defaultValue="sales_executive"
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
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

            {websites.length > 0 ? (
              <div className="space-y-2">
                <Label>Permitted websites</Label>
                <p className="text-xs text-[var(--ink-muted)]">
                  Super administrators have access to all websites automatically.
                </p>
                <div className="grid gap-2 rounded-md border border-[var(--border)] p-3 sm:grid-cols-2">
                  {websites.map((website) => (
                    <label
                      key={website.id}
                      className="flex items-center gap-2 text-sm text-[var(--ink)]"
                    >
                      <input
                        type="checkbox"
                        name="permittedWebsiteIds"
                        value={website.id}
                        className="rounded border-[var(--border-strong)]"
                      />
                      {website.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {state?.message ? (
              <p
                className={`text-sm ${state.success ? "text-emerald-600" : "text-[var(--danger)]"}`}
              >
                {state.message}
              </p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
