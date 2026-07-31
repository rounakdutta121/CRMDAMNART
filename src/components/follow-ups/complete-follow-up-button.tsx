"use client";

import { Button } from "@/components/ui/button";

/** Follow-ups are deprecated; button kept for unused component compatibility. */
export function CompleteFollowUpButton({
  followUpId: _followUpId,
}: {
  followUpId: string;
}) {
  return (
    <Button type="button" size="sm" variant="outline" disabled>
      Complete
    </Button>
  );
}
