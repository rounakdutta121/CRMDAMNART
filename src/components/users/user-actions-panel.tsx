"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import {
  deactivateUserAction,
  resetPasswordAction,
  type ActionResult,
} from "@/app/actions";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { success: false, message: "" };

export function UserActionsPanel({
  userId,
  isActive,
  canDeactivate,
  canResetPassword = true,
}: {
  userId: string;
  isActive: boolean;
  canDeactivate: boolean;
  canResetPassword?: boolean;
}) {
  const resetAction = resetPasswordAction.bind(null, userId);
  const [resetState, resetFormAction, resetPending] = useActionState(
    resetAction,
    initial
  );
  const [deactivatePending, startDeactivate] = useTransition();

  function handleDeactivate() {
    if (!confirm("Deactivate this user? Their active sessions will be invalidated.")) {
      return;
    }

    startDeactivate(async () => {
      const result = await deactivateUserAction(userId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "User deactivated.");
    });
  }

  return (
    <div className="space-y-4">
      <GlobalLoadingSync pending={resetPending || deactivatePending} />
      {canResetPassword ? (
        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={resetFormAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                />
              </div>
              {resetState?.message ? (
                <p
                  className={`text-sm ${resetState.success ? "text-emerald-600" : "text-[var(--danger)]"}`}
                >
                  {resetState.message}
                </p>
              ) : null}
              <Button type="submit" variant="outline" disabled={resetPending}>
                {resetPending ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isActive && canDeactivate ? (
        <Card>
          <CardHeader>
            <CardTitle>Deactivate user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--ink-muted)]">
              Deactivated users cannot sign in. Their session tokens are
              invalidated immediately.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={deactivatePending}
              onClick={handleDeactivate}
            >
              {deactivatePending ? "Deactivating…" : "Deactivate user"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
