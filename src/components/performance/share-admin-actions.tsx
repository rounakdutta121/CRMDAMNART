"use client";

import { useState, useTransition } from "react";
import {
  regenerateDashboardShareSlugAction,
  revokeDashboardShareAction,
  type ActionResult,
} from "@/app/actions";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import type { DashboardShareStatus } from "@/types/dashboard-share";

export function ShareAdminActions({
  shareId,
  status,
}: {
  shareId: string;
  status: DashboardShareStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeDashboardShareAction(shareId);
      setMessage(result.message ?? null);
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result: ActionResult = await regenerateDashboardShareSlugAction(shareId);
      setMessage(result.message ?? null);
      if (result.success && result.data?.shareUrl) {
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
        {status !== "revoked" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleRevoke}
          >
            Revoke share
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
