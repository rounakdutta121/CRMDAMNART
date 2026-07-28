import { notFound, redirect } from "next/navigation";
import { EditWebsiteForm } from "@/components/websites/edit-website-form";
import { requireSession } from "@/lib/auth";
import { canManageWebsites } from "@/lib/permissions";
import { getWebsiteForUser } from "@/services/websites.service";

export default async function EditWebsitePage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const user = await requireSession();
  if (!canManageWebsites(user.role)) {
    redirect("/websites");
  }

  const { websiteId } = await params;
  const website = await getWebsiteForUser(user, websiteId).catch(() => null);
  if (!website) {
    notFound();
  }

  return (
    <EditWebsiteForm
      website={{
        id: website._id.toHexString(),
        name: website.name,
        code: website.code,
        primaryDomain: website.primaryDomain,
        additionalDomains: website.additionalDomains,
        brandName: website.brandName,
        businessDivision: website.businessDivision,
        defaultCurrency: website.defaultCurrency,
        timezone: website.timezone,
        isActive: website.isActive,
      }}
    />
  );
}
