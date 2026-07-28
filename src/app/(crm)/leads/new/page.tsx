import { redirect } from "next/navigation";
import { NewLeadForm } from "@/components/leads/new-lead-form";
import { requireSession } from "@/lib/auth";
import { canCreateManualLeads } from "@/lib/permissions";
import { getAssignableUsers } from "@/services/auth.service";
import { getFormsForWebsite } from "@/services/forms.service";
import { getAccessibleWebsites } from "@/services/websites.service";

export default async function NewLeadPage() {
  const user = await requireSession();
  if (!canCreateManualLeads(user.role)) {
    redirect("/leads");
  }

  const [websites, users] = await Promise.all([
    getAccessibleWebsites(user, { isActive: true }),
    getAssignableUsers(
      user.role === "super_admin" ? undefined : user.permittedWebsiteIds
    ),
  ]);

  const websitesWithForms = await Promise.all(
    websites.map(async (website) => {
      const forms = await getFormsForWebsite(user, website._id.toHexString(), {
        isActive: true,
      });

      return {
        id: website._id.toHexString(),
        name: website.name,
        forms: forms.map((form) => ({
          id: form._id.toHexString(),
          name: form.name,
          code: form.code,
          schemaMode: form.schemaMode,
          fields: form.fields,
        })),
      };
    })
  );

  return (
    <NewLeadForm
      websites={websitesWithForms}
      users={users.map((assignee) => ({
        id: assignee._id.toHexString(),
        name: assignee.name,
      }))}
    />
  );
}
