import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { ContactMergePanel } from "@/components/contacts/contact-merge-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { canMergeContacts } from "@/lib/permissions";
import { getDuplicateContactsPage } from "@/services/contacts.service";
import { redirect } from "next/navigation";

export default async function ContactDuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireSession();
  if (!canMergeContacts(user.role)) {
    redirect("/contacts");
  }

  const params = await searchParams;
  const selectedKey =
    typeof params.group === "string" ? params.group : undefined;
  const groups = await getDuplicateContactsPage(user);
  const selectedGroup =
    groups.find((group) => group.key === selectedKey) ?? groups[0];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Contacts", href: "/contacts" },
          { label: "Duplicates" },
        ]}
      />
      <PageHeader
        title="Duplicate contacts"
        description="Review possible duplicates and merge records into a single contact."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Duplicate groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">No duplicate groups found.</p>
            ) : (
              groups.map((group) => (
                <Link
                  key={group.key}
                  href={`/contacts/duplicates?group=${encodeURIComponent(group.key)}`}
                  className={`block rounded-md border px-3 py-2 text-sm ${
                    selectedGroup?.key === group.key
                      ? "border-[var(--accent)] bg-[var(--surface)]"
                      : "border-[var(--border)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <p className="font-medium">{group.contacts[0]?.name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {group.contacts.length} possible matches
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Merge contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedGroup ? (
              <ContactMergePanel
                contacts={selectedGroup.contacts.map((contact) => ({
                  id: contact._id.toHexString(),
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                }))}
              />
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">Select a duplicate group.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
