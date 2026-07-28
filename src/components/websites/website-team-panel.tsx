"use client";

import { useActionState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  addWebsiteAccessAction,
  removeWebsiteAccessAction,
  type ActionResult,
} from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types/auth";

const initial: ActionResult = { success: false, message: "" };

export interface WebsiteTeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  canReceiveLeadAssignments: boolean;
  canViewUnassignedLeads: boolean;
  lastLoginAt: string | null;
  openLeads: number;
  leadsThisMonth: number;
}

export interface WebsiteTeamEligibleUser {
  id: string;
  name: string;
  email: string;
}

export function WebsiteTeamPanel({
  websiteId,
  websiteName,
  members,
  eligibleUsers,
}: {
  websiteId: string;
  websiteName: string;
  members: WebsiteTeamMemberRow[];
  eligibleUsers: WebsiteTeamEligibleUser[];
}) {
  const [addState, addAction, addPending] = useActionState(
    addWebsiteAccessAction,
    initial
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeWebsiteAccessAction,
    initial
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: websiteName, href: `/websites/${websiteId}` },
          { label: "Team" },
        ]}
      />
      <PageHeader
        title="Website team"
        description="Manage sales team access and assignment eligibility."
        actionLabel="Invite for website"
        actionHref={`/settings/users/invite?websiteId=${websiteId}`}
      />

      <Card className="mb-6 max-w-xl">
        <CardContent className="pt-6">
          <form action={addAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="websiteId" value={websiteId} />
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="userId">Add existing user</Label>
              <select
                id="userId"
                name="userId"
                required
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
              >
                <option value="">Select user</option>
                {eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={addPending}>
              Add to team
            </Button>
          </form>
          {addState.message ? (
            <p className={`mt-2 text-sm ${addState.success ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {addState.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Assignments</th>
              <th className="px-4 py-3 font-medium">Open leads</th>
              <th className="px-4 py-3 font-medium">This month</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--ink-muted)]">
                  No team members yet. Invite a user or add an existing one above.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/settings/users/${member.id}`}
                      className="font-medium hover:underline"
                    >
                      {member.name}
                    </Link>
                    <p className="text-xs text-[var(--ink-muted)]">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[member.role]}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={
                          member.canReceiveLeadAssignments ? "success" : "secondary"
                        }
                      >
                        {member.canReceiveLeadAssignments ? "Eligible" : "Not eligible"}
                      </Badge>
                      {member.canViewUnassignedLeads ? (
                        <span className="text-xs text-[var(--ink-muted)]">Views unassigned</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{member.openLeads}</td>
                  <td className="px-4 py-3">{member.leadsThisMonth}</td>
                  <td className="px-4 py-3">
                    {member.lastLoginAt
                      ? format(new Date(member.lastLoginAt), "dd MMM yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {member.role !== "super_admin" ? (
                      <form action={removeAction} className="space-y-2">
                        <input type="hidden" name="userId" value={member.id} />
                        <input type="hidden" name="websiteId" value={websiteId} />
                        <input type="hidden" name="unassignLeads" value="true" />
                        {member.openLeads > 0 ? (
                          <p className="text-xs text-amber-700">
                            {member.openLeads} open lead(s) will be unassigned.
                          </p>
                        ) : null}
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={removePending}
                        >
                          Remove access
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--ink-subtle)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {removeState.message ? (
        <p className={`mt-3 text-sm ${removeState.success ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {removeState.message}
        </p>
      ) : null}
    </div>
  );
}
