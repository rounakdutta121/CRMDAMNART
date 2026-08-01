import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateIST } from "@/lib/datetime";
import { LeadStatusBadge } from "@/components/shared/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { getContactDetail } from "@/services/contacts.service";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const user = await requireSession();
  const { contactId } = await params;

  let detail;
  try {
    detail = await getContactDetail(user, contactId);
  } catch {
    notFound();
  }

  const { contact, leads } = detail;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Contacts", href: "/contacts" },
          { label: contact.name },
        ]}
      />
      <PageHeader title={contact.name} description="Contact profile and related leads" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: {contact.email ?? "—"}</p>
            <p>Phone: {contact.phone ?? "—"}</p>
            <p>WhatsApp: {contact.whatsapp ?? "—"}</p>
            <p>Company: {contact.company ?? "—"}</p>
            <p>
              Location:{" "}
              {[contact.city, contact.state, contact.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">No accessible leads.</p>
            ) : (
              leads.map((lead) => (
                <Link
                  key={lead._id.toHexString()}
                  href={`/leads/${lead._id.toHexString()}`}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface)]"
                >
                  <div>
                    <p className="text-sm font-medium">{lead.leadNumber}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {lead.service ?? "No service"} ·{" "}
                      {formatDateIST(lead.createdAt)}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
