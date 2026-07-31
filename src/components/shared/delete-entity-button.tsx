"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions";
import { useGlobalLoading } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";

export function DeleteEntityButton({
  label,
  pendingLabel = "Deleting…",
  confirmMessage,
  redirectTo,
  action,
  size = "default",
}: {
  label: string;
  pendingLabel?: string;
  confirmMessage: string;
  redirectTo?: string;
  action: () => Promise<ActionResult>;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useGlobalLoading(pending);

  function handleClick() {
    if (!confirm(confirmMessage)) {
      return;
    }

    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Deleted.");
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
