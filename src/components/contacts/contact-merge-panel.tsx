"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { mergeContactsAction, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";

const initial: ActionResult = { success: false, message: "" };

export interface MergeContactOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export function ContactMergePanel({
  contacts,
}: {
  contacts: MergeContactOption[];
}) {
  const [state, action, pending] = useActionState(mergeContactsAction, initial);

  useEffect(() => {
    if (!state?.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  if (contacts.length < 2) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        Select a duplicate group with at least two contacts to merge.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4 border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="primaryContactId" className="text-sm font-medium">
            Keep (primary)
          </label>
          <select
            id="primaryContactId"
            name="primaryContactId"
            required
            className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.email ? ` · ${contact.email}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="secondaryContactId" className="text-sm font-medium">
            Merge into primary
          </label>
          <select
            id="secondaryContactId"
            name="secondaryContactId"
            required
            className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.phone ? ` · ${contact.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="preserveFrom" className="text-sm font-medium">
          Preserve field values from
        </label>
        <select
          id="preserveFrom"
          name="preserveFrom"
          defaultValue="primary"
          className="h-10 w-full max-w-xs rounded-md border border-[var(--border)] px-3 text-sm"
        >
          <option value="primary">Primary contact</option>
          <option value="secondary">Secondary contact</option>
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Merging…" : "Merge contacts"}
      </Button>
    </form>
  );
}
