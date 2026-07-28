import Link from "next/link";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { LeadImportWizard } from "@/components/leads/lead-import-wizard";
import { requireSession } from "@/lib/auth";
import { canImportLeads, resolveWebsiteFilter } from "@/lib/permissions";
import { listWebsites } from "@/repositories/websites.repository";
import { redirect } from "next/navigation";

export default async function LeadImportPage() {
  const user = await requireSession();
  if (!canImportLeads(user.role)) {
    redirect("/leads");
  }

  const websiteIds = resolveWebsiteFilter(user);
  const websites = await listWebsites(
    websiteIds === null ? undefined : { ids: websiteIds }
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Leads", href: "/leads" },
          { label: "Import CSV" },
        ]}
      />
      <PageHeader
        title="Import leads"
        description="Upload a CSV, map columns to CRM fields, preview rows, and import."
      />
      <LeadImportWizard
        websites={websites.map((website) => ({
          id: website._id.toHexString(),
          name: website.name,
        }))}
      />
      <p className="mt-4 text-sm text-[var(--ink-muted)]">
        <Link href="/leads" className="underline">
          Back to leads
        </Link>
      </p>
    </div>
  );
}
