import { notFound } from "next/navigation";
import { TestFormPanel } from "@/components/forms/test-form-panel";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/auth";
import { getFormForUser } from "@/services/forms.service";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function TestWebsiteFormPage({
  params,
}: {
  params: Promise<{ websiteId: string; formId: string }>;
}) {
  const user = await requireSession();
  const { websiteId, formId } = await params;

  let website;
  let form;
  try {
    website = await getWebsiteForUser(user, websiteId);
    form = await getFormForUser(user, formId);
    if (form.websiteId.toHexString() !== websiteId) {
      notFound();
    }
  } catch {
    notFound();
  }

  const serializedFields = form.fields.map((field) => ({
    id: field.id,
    incomingKey: field.incomingKey,
    aliases: field.aliases,
    label: field.label,
    description: field.description,
    fieldType: field.fieldType,
    canonicalTarget: field.canonicalTarget,
    required: field.required,
    active: field.active,
    order: field.order,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue,
    options: field.options,
    validation: field.validation,
    trimValue: field.trimValue,
    normalizeValue: field.normalizeValue,
    showOnLeadDetail: field.showOnLeadDetail,
    showOnLeadList: field.showOnLeadList,
    searchable: field.searchable,
    sensitive: field.sensitive,
  }));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: website.name, href: `/websites/${websiteId}` },
          { label: "Forms", href: `/websites/${websiteId}/forms` },
          {
            label: form.name,
            href: `/websites/${websiteId}/forms/${formId}`,
          },
          { label: "Test" },
        ]}
      />
      <PageHeader
        title={`Test ${form.name}`}
        description="Validate field mappings or create a test lead tagged with isTestLead."
      />

      <TestFormPanel
        websiteId={websiteId}
        formId={formId}
        fields={serializedFields}
      />
    </div>
  );
}
