"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { completeFollowUpAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function CompleteFollowUpButton({
  followUpId,
}: {
  followUpId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await completeFollowUpAction(followUpId);
          if (result.success) {
            toast.success(result.message ?? "Completed");
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      {pending ? "…" : "Complete"}
    </Button>
  );
}
