"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions";
import { useGlobalLoading } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RenameEntityButton({
  currentName,
  entityLabel = "name",
  action,
  size = "default",
}: {
  currentName: string;
  entityLabel?: string;
  action: (name: string) => Promise<ActionResult>;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();
  useGlobalLoading(pending);

  function handleSave() {
    const next = name.trim();
    if (!next) {
      toast.error(`${entityLabel} is required.`);
      return;
    }
    if (next === currentName.trim()) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await action(next);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Renamed.");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => {
          setName(currentName);
          setOpen(true);
        }}
      >
        Rename
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="min-w-[12rem] flex-1 space-y-1">
        <Label htmlFor="rename-entity-name">New {entityLabel}</Label>
        <Input
          id="rename-entity-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSave();
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          autoFocus
          disabled={pending}
        />
      </div>
      <Button type="button" size={size} disabled={pending} onClick={handleSave}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={pending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
