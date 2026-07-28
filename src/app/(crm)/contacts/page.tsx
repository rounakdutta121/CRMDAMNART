import Link from "next/link";
import { format } from "date-fns";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { requireSession } from "@/lib/auth";
import { getContactsPage } from "@/services/contacts.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const data = await getContactsPage(user, params);
  const search = typeof params.search === "string" ? params.search : undefined;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Contacts" }]} />
      <PageHeader
        title="Contacts"
        description="People behind DamnArt enquiries. Multiple leads can share one contact."
      />

      <form className="mb-4 flex gap-2">
        <Input
          name="search"
          placeholder="Search contacts"
          defaultValue={search}
          className="max-w-sm"
        />
        <Button type="submit">Search</Button>
      </form>

      {data.items.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Contacts are created automatically from webhook and manual lead submissions."
        />
      ) : (
        <>
          <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface)] text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((contact) => (
                  <tr
                    key={contact._id.toHexString()}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/contacts/${contact._id.toHexString()}`}
                        className="font-medium hover:underline"
                      >
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{contact.email ?? "—"}</td>
                    <td className="px-4 py-3">{contact.phone ?? "—"}</td>
                    <td className="px-4 py-3">{contact.company ?? "—"}</td>
                    <td className="px-4 py-3">
                      {format(contact.createdAt, "dd MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={data.page}
            totalPages={data.totalPages}
            basePath="/contacts"
            searchParams={search ? { search } : {}}
          />
        </>
      )}
    </div>
  );
}
