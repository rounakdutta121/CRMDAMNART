import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import {
  CrmDocsContent,
  CrmDocsToc,
} from "@/components/docs/crm-docs-content";
import { requireSession } from "@/lib/auth";

export default async function DocsPage() {
  await requireSession();

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Command" }, { label: "Documentation" }]}
      />
      <PageHeader
        title="Documentation"
        description="How to use every DamnArt CRM module — from leads and websites to shares, users, and permissions."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CrmDocsToc />
        </aside>
        <CrmDocsContent />
      </div>
    </div>
  );
}
