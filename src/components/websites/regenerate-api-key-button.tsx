"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { regenerateApiKeyAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { useGlobalLoading } from "@/components/shared/global-loading";
import { useState } from "react";

export function RegenerateApiKeyButton({ websiteId }: { websiteId: string }) {
  const [pending, startTransition] = useTransition();
  useGlobalLoading(pending);
  const [newKey, setNewKey] = useState<string | null>(null);

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateApiKeyAction(websiteId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const apiKey =
        result.data && typeof result.data.apiKey === "string"
          ? result.data.apiKey
          : null;
      setNewKey(apiKey);
      toast.success(result.message ?? "API key regenerated.");
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Regenerate API key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate API key</DialogTitle>
          <DialogDescription>
            The previous API key will stop working immediately. Copy the new key
            now — it will not be shown again.
          </DialogDescription>
        </DialogHeader>
        {newKey ? (
          <div className="space-y-3">
            <code className="block break-all rounded-md bg-[var(--surface)] px-3 py-2 text-sm">
              {newKey}
            </code>
            <CopyButton value={newKey} label="Copy new API key" />
          </div>
        ) : (
          <Button type="button" onClick={handleRegenerate} disabled={pending}>
            {pending ? "Regenerating…" : "Confirm regenerate"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
