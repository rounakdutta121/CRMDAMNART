"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteDashboardShareAction,
  regenerateDashboardShareSlugAction,
  revokeDashboardShareAction,
  type ActionResult,
} from "@/app/actions";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import type { DashboardShareStatus } from "@/types/dashboard-share";

export function ShareAdminActions({
  shareId,
  websiteId,
  status,
  canRevokeOrDelete,
}: {
  shareId: string;
  websiteId: string;
  status: DashboardShareStatus;
  canRevokeOrDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  function handleRevoke() {
    if (!confirm("Revoke this share? The public link will stop working.")) {
      return;
    }

    startTransition(async () => {
      const result = await revokeDashboardShareAction(shareId);
      if (!result.success) {
        toast.error(result.message);
        setMessage(result.message ?? null);
        return;
      }
      toast.success(result.message ?? "Dashboard share revoked.");
      setMessage(result.message ?? null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        "Permanently delete this share? This cannot be undone."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDashboardShareAction(shareId);
      if (!result.success) {
        toast.error(result.message);
        setMessage(result.message ?? null);
        return;
      }
      toast.success(result.message ?? "Dashboard share deleted.");
      router.push(`/websites/${websiteId}/performance/shares`);
      router.refresh();
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result: ActionResult = await regenerateDashboardShareSlugAction(shareId);
      setMessage(result.message ?? null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Share link regenerated.");
      if (result.data?.shareUrl) {
        setShareUrl(String(result.data.shareUrl));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || status === "revoked"}
          onClick={handleRegenerate}
        >
          Regenerate link
        </Button>
        {canRevokeOrDelete && status !== "revoked" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleRevoke}
          >
            Revoke share
          </Button>
        ) : null}
        {canRevokeOrDelete && status === "revoked" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleDelete}
          >
            Delete share
          </Button>
        ) : null}
      </div>
      {shareUrl ? (
        <div className="flex items-center gap-2">
          <code className="break-all text-sm">{shareUrl}</code>
          <CopyButton value={shareUrl} label="Copy" />
        </div>
      ) : null}
      {message ? <p className="text-sm text-[var(--ink-muted)]">{message}</p> : null}
    </div>
  );
}
