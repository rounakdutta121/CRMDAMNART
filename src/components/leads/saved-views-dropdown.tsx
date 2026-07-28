"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteLeadViewAction,
  saveLeadViewAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SavedViewItem {
  id: string;
  name: string;
  filters: Record<string, string | string[] | boolean>;
  isDefault: boolean;
}

export function SavedViewsDropdown({
  views,
  currentFilters,
}: {
  views: SavedViewItem[];
  currentFilters: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [viewName, setViewName] = useState("");

  function handleSaveView(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSaveTransition(async () => {
      const result = await saveLeadViewAction(undefined, formData);
      if (result.success) {
        toast.success(result.message ?? "View saved.");
        setViewName("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function loadView(view: SavedViewItem) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(view.filters)) {
      if (typeof value === "string" && value) {
        params.set(key, value);
      }
    }
    router.push(`/leads?${params.toString()}`);
  }

  function deleteView(viewId: string) {
    startTransition(async () => {
      const result = await deleteLeadViewAction(viewId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label htmlFor="saved-view" className="text-xs font-medium text-[var(--ink-muted)]">
          Saved views
        </label>
        <select
          id="saved-view"
          className="h-10 min-w-[180px] rounded-md border border-[var(--border)] px-3 text-sm"
          defaultValue=""
          onChange={(event) => {
            const view = views.find((item) => item.id === event.target.value);
            if (view) loadView(view);
          }}
        >
          <option value="">Load view…</option>
          {views.map((view) => (
            <option key={view.id} value={view.id}>
              {view.name}
              {view.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSaveView} className="flex items-end gap-2">
        <input
          type="hidden"
          name="filters"
          value={JSON.stringify(currentFilters)}
        />
        <input type="hidden" name="visibleColumns" value="[]" />
        <div className="space-y-1">
          <label htmlFor="view-name" className="text-xs font-medium text-[var(--ink-muted)]">
            Save current
          </label>
          <Input
            id="view-name"
            name="name"
            placeholder="View name"
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="outline" disabled={savePending}>
          Save
        </Button>
      </form>

      {views.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {views.map((view) => (
            <Button
              key={view.id}
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => deleteView(view.id)}
            >
              Delete {view.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
