"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  contactAttemptAction,
  type ActionResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOW_UP_METHODS,
  FOLLOW_UP_METHOD_LABELS,
} from "@/lib/constants";

const initial: ActionResult = { success: false, message: "" };

const COMMUNICATION_METHODS = FOLLOW_UP_METHODS.filter((method) =>
  ["call", "email", "whatsapp", "meeting"].includes(method)
);

export function CommunicationLogForm({
  leadId,
  canLog,
}: {
  leadId: string;
  canLog: boolean;
}) {
  const bound = contactAttemptAction.bind(null, leadId);
  const [state, action, pending] = useActionState(bound, initial);

  useEffect(() => {
    if (!state?.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  if (!canLog) {
    return null;
  }

  return (
    <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
        Log communication
      </h3>
      <form action={action} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`comm-method-${leadId}`}>Method</Label>
          <select
            id={`comm-method-${leadId}`}
            name="method"
            defaultValue="call"
            className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
          >
            {COMMUNICATION_METHODS.map((method) => (
              <option key={method} value={method}>
                {FOLLOW_UP_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </div>
        <Textarea name="note" rows={3} placeholder="Notes about this interaction" />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Log communication"}
        </Button>
      </form>
    </section>
  );
}
