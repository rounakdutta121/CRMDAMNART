"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  acceptInvitationAction,
  type ActionResult,
} from "@/app/actions";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { formatDateTimeIST } from "@/lib/datetime";
import type { UserRole } from "@/types/auth";

const initial: ActionResult = { success: false, message: "" };

export function AcceptInvitationForm({
  token,
  preview,
}: {
  token: string;
  preview: {
    email: string;
    invitedName?: string;
    role: UserRole;
    expiresAt: string;
  };
}) {
  const router = useRouter();
  const boundAction = acceptInvitationAction.bind(null, token);
  const [state, action, pending] = useActionState(boundAction, initial);

  useEffect(() => {
    if (state.success) {
      router.push("/login?accepted=1");
    }
  }, [state.success, router]);

  return (
    <div className="archive-grain flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <GlobalLoadingSync pending={pending} />
      <div className="page-editorial w-full">
        <div className="mb-8 border-b border-[var(--border-strong)] pb-6">
          <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
            Access authorisation
          </p>
          <h1 className="mt-3 font-editorial text-3xl font-semibold text-[var(--ink)]">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Accept your invitation to join the lead archive.
          </p>
        </div>

        <div className="border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 sm:p-6">
          <div className="mb-5 grid gap-3 border-b border-[var(--border)] pb-4 sm:grid-cols-3">
            <div>
              <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
                Recipient
              </p>
              <p className="mt-1 font-mono-id text-xs text-[var(--ink)]">
                {preview.email}
              </p>
            </div>
            <div>
              <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
                Role
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">
                {ROLE_LABELS[preview.role]}
              </p>
            </div>
            <div>
              <p className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
                Expires
              </p>
              <p className="mt-1 font-mono-id text-xs text-[var(--ink)]">
                {formatDateTimeIST(preview.expiresAt)}
              </p>
            </div>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={preview.invitedName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
              <p className="text-xs text-[var(--ink-subtle)]">
                Minimum 10 characters with uppercase, lowercase, number and
                special character.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
              />
            </div>

            {state.message ? (
              <p
                className={`border px-3 py-2 text-sm ${
                  state.success
                    ? "border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]"
                    : "border-[var(--danger)] bg-[var(--danger-muted)] text-[var(--danger)]"
                }`}
                role="alert"
              >
                {state.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account…" : "Accept invitation"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
