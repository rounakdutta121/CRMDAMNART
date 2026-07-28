"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  verifyDashboardSharePasswordAction,
  type ActionResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { success: false, message: "" };

export function DashboardSharePasswordGate({
  shareSlug,
  title,
}: {
  shareSlug: string;
  title: string;
}) {
  const router = useRouter();
  const boundAction = verifyDashboardSharePasswordAction.bind(null, shareSlug);
  const [state, action, pending] = useActionState(boundAction, initial);

  if (state.success) {
    router.refresh();
  }

  return (
    <div className="archive-grain flex min-h-screen items-center justify-center bg-background px-4">
      <div className="page-editorial w-full border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 sm:p-8">
        <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
          Restricted report
        </p>
        <h1 className="mt-3 font-editorial text-2xl font-semibold text-[var(--ink)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Enter the share password to view aggregate performance metrics.
        </p>
        <form action={action} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Dashboard password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state.message && !state.success ? (
            <p
              className="border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]"
              role="alert"
            >
              {state.message}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verifying…" : "View dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
