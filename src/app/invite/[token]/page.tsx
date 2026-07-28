import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { AcceptInvitationForm } from "@/components/invitations/accept-invitation-form";
import { getInvitationAcceptancePreview } from "@/services/invitations.service";
import { notFound } from "next/navigation";

export const metadata = {
  robots: "noindex,nofollow",
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvitationAcceptancePreview(token);

  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid: "This invitation link is invalid.",
      expired:
        "This invitation has expired. Ask an administrator for a new link.",
      revoked: "This invitation has been revoked.",
      accepted: "This invitation has already been accepted.",
    };

    return (
      <div className="archive-grain flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="page-editorial w-full">
          <CardHeader>
            <p className="font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
              Invitation status
            </p>
            <CardTitle>{APP_NAME}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--ink-muted)]">
              {messages[result.reason]}
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result.preview) {
    notFound();
  }

  return (
    <AcceptInvitationForm
      token={token}
      preview={{
        email: result.preview.email,
        invitedName: result.preview.invitedName,
        role: result.preview.role,
        expiresAt: result.preview.expiresAt.toISOString(),
      }}
    />
  );
}
