import { notFound, redirect } from "next/navigation";
import { EditFormBuilder } from "@/components/forms/edit-form-builder";
import { requireSession } from "@/lib/auth";
import { normalizeFormFieldDefinitions } from "@/lib/form-schema";
import { canManageForms } from "@/lib/permissions";
import { getFormForUser } from "@/services/forms.service";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function EditWebsiteFormPage({
  params,
}: {
  params: Promise<{ websiteId: string; formId: string }>;
}) {
  const user = await requireSession();
  if (!canManageForms(user.role)) {
    redirect("/dashboard");
  }

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

  return (
    <EditFormBuilder
      form={{
        id: form._id.toHexString(),
        websiteId,
        websiteName: website.name,
        name: form.name,
        description: form.description,
        pageUrl: form.pageUrl,
        fields: normalizeFormFieldDefinitions(form.fields),
        unknownFieldPolicy: form.unknownFieldPolicy,
        contactIdentityRule: form.contactIdentityRule,
        attributionEnabled: form.attributionEnabled,
        isActive: form.isActive,
      }}
    />
  );
}
