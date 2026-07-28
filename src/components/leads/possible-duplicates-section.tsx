import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface SerializedDuplicateContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

export function PossibleDuplicatesSection({
  duplicates,
  canMerge,
}: {
  duplicates: SerializedDuplicateContact[];
  canMerge: boolean;
}) {
  if (duplicates.length === 0) {
    return null;
  }

  return (
    <section className="border border-amber-200 bg-[var(--warning-muted)] p-4">
      <h3 className="mb-2 text-sm font-semibold text-amber-950">
        Possible duplicate contacts
      </h3>
      <ul className="space-y-2">
        {duplicates.map((contact) => (
          <li
            key={contact.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[var(--surface-elevated)] px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-[var(--ink)]">{contact.name}</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {[contact.email, contact.phone, contact.company]
                  .filter(Boolean)
                  .join(" · ") || "No details"}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/contacts/${contact.id}`}>View</Link>
            </Button>
          </li>
        ))}
      </ul>
      {canMerge ? (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/contacts/duplicates">Open merge tool</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
