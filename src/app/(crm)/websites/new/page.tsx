"use client";

import { useActionState } from "react";
import { createWebsiteAction, type ActionResult } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionResult = { success: false, message: "" };

export default function NewWebsitePage() {
  const [state, action, pending] = useActionState(createWebsiteAction, initial);

  return (
    <div>
      <GlobalLoadingSync pending={pending} />
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: "New website" },
        ]}
      />
      <PageHeader
        title="Create website"
        description="A unique webhook endpoint and API key will be generated automatically."
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="DamnArt Main Website" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" required placeholder="damnart-main" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryDomain">Primary domain</Label>
                <Input
                  id="primaryDomain"
                  name="primaryDomain"
                  required
                  placeholder="damnart.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="additionalDomains">Additional domains</Label>
                <Input
                  id="additionalDomains"
                  name="additionalDomains"
                  placeholder="landing.damnart.com, ads.damnart.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand name</Label>
                <Input id="brandName" name="brandName" placeholder="DamnArt" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessDivision">Business division</Label>
                <Input
                  id="businessDivision"
                  name="businessDivision"
                  placeholder="Digital Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Currency</Label>
                <Input id="defaultCurrency" name="defaultCurrency" defaultValue="INR" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" defaultValue="Asia/Kolkata" />
              </div>
            </div>

            {state && !state.success && state.message ? (
              <p className="text-sm text-[var(--danger)]">{state.message}</p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create website"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
