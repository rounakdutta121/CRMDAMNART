"use client";

import { useState, useTransition } from "react";
import {
  regenerateInvitationAction,
  revokeInvitationAction,
  type ActionResult,
} from "@/app/actions";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import type { InvitationStatus } from "@/types/invitation";

export function InvitationActions({
  invitationId,
  status,
}: {
  invitationId: string;
  status: InvitationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeInvitationAction(invitationId);
      setMessage(result.message ?? null);
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result: ActionResult = await regenerateInvitationAction(invitationId);
      setMessage(result.message ?? null);
      if (result.success && result.data?.inviteLink) {
        setInviteLink(String(result.data.inviteLink));
      }
    });
  }

  if (status !== "pending" && status !== "expired") {
    return <span className="text-xs text-[var(--ink-subtle)]">—</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleRegenerate}
        >
          Regenerate link
        </Button>
        {status === "pending" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={handleRevoke}
          >
            Revoke
          </Button>
        ) : null}
      </div>
      {inviteLink ? (
        <div className="flex items-center gap-2">
          <code className="max-w-[200px] truncate text-xs">{inviteLink}</code>
          <CopyButton value={inviteLink} label="Copy" />
        </div>
      ) : null}
      {message ? <p className="text-xs text-[var(--ink-muted)]">{message}</p> : null}
    </div>
  );
}
