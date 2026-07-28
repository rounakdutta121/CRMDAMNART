import { format } from "date-fns";

export interface SerializedAssignmentHistoryItem {
  id: string;
  previousUserName: string;
  newUserName: string;
  changedByName: string;
  createdAt: string;
}

export function AssignmentHistorySection({
  items,
}: {
  items: SerializedAssignmentHistoryItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
        Assignment history
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="border-l-2 border-[var(--border)] pl-3 text-sm">
            <p className="text-[var(--ink)]">
              {item.previousUserName} → {item.newUserName}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              by {item.changedByName} ·{" "}
              {format(new Date(item.createdAt), "dd MMM yyyy HH:mm")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
