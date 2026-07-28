"use client";

import { useActionState } from "react";
import { updateUserAction, type ActionResult } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/auth";

const initial: ActionResult = { success: false, message: "" };

export interface EditUserFormData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permittedWebsiteIds: string[];
  isActive: boolean;
  canReceiveLeadAssignments: boolean;
  canViewUnassignedLeads: boolean;
}

export function EditUserForm({
  user,
  websites,
  assignableRoles,
}: {
  user: EditUserFormData;
  websites: { id: string; name: string }[];
  assignableRoles: UserRole[];
}) {
  const action = updateUserAction.bind(null, user.id);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users", href: "/settings/users" },
          { label: user.name, href: `/settings/users/${user.id}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader title={`Edit ${user.name}`} />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={user.name} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={user.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  required
                  defaultValue={user.role}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
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
                  defaultValue={user.isActive ? "true" : "false"}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {websites.length > 0 && user.role !== "super_admin" ? (
              <div className="space-y-2">
                <Label>Permitted websites</Label>
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
                        defaultChecked={user.permittedWebsiteIds.includes(
                          website.id
                        )}
                        className="rounded border-[var(--border-strong)]"
                      />
                      {website.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="canReceiveLeadAssignments"
                  value="true"
                  defaultChecked={user.canReceiveLeadAssignments}
                />
                Can receive lead assignments
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="canViewUnassignedLeads"
                  value="true"
                  defaultChecked={user.canViewUnassignedLeads}
                />
                Can view unassigned leads
              </label>
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
