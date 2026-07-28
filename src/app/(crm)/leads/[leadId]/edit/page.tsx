import { redirect } from "next/navigation";

export default async function LeadEditPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  redirect(`/leads/${leadId}`);
}
