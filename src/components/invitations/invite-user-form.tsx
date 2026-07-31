"use client";

import { useActionState } from "react";
import {
  createInvitationAction,
  type ActionResult,
} from "@/app/actions";
import { CopyButton } from "@/components/shared/copy-button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INVITATION_EXPIRY_HOURS,
  INVITATION_EXPIRY_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import type { UserRole } from "@/types/auth";

const initial: ActionResult = { success: false, message: "" };

export function InviteUserForm({
  websites,
  assignableRoles,
  preselectedWebsiteIds = [],
}: {
  websites: { id: string; name: string }[];
  assignableRoles: UserRole[];
  preselectedWebsiteIds?: string[];
}) {
  const [state, action, pending] = useActionState(createInvitationAction, initial);
  const inviteLink =
    state.success && state.data?.inviteLink
      ? String(state.data.inviteLink)
      : null;

  return (
    <div>
      <GlobalLoadingSync pending={pending} />
      <Breadcrumbs
        items={[
          { label: "Settings" },
          { label: "Users", href: "/settings/users" },
          { label: "Invitations", href: "/settings/users/invitations" },
          { label: "Invite" },
        ]}
      />
      <PageHeader
        title="Invite user"
        description="Generate a secure invitation link. No email provider is required."
      />

      {inviteLink ? (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Invitation link created</p>
              <code className="mt-1 block break-all text-sm text-green-950">{inviteLink}</code>
            </div>
            <CopyButton value={inviteLink} label="Copy link" />
          </CardContent>
        </Card>
      ) : null}

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitedName">Full name</Label>
              <Input id="invitedName" name="invitedName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                required
                defaultValue="sales_executive"
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
              <Label>Permitted websites</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {websites.map((website) => (
                  <label
                    key={website.id}
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="permittedWebsiteIds"
                      value={website.id}
                      defaultChecked={preselectedWebsiteIds.includes(website.id)}
                    />
                    {website.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="canReceiveLeadAssignments"
                  value="true"
                  defaultChecked
                />
                Can receive lead assignments
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="canViewUnassignedLeads" value="true" />
                Can view unassigned leads
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" name="note" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryHours">Expiry</Label>
              <select
                id="expiryHours"
                name="expiryHours"
                defaultValue={168}
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
              >
                {INVITATION_EXPIRY_HOURS.map((hours) => (
                  <option key={hours} value={hours}>
                    {INVITATION_EXPIRY_LABELS[hours]}
                  </option>
                ))}
              </select>
            </div>

            {state.message && !inviteLink ? (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {state.message}
              </p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
