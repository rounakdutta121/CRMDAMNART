import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import {
  FulfilmentStatusBadge,
  PriorityBadge,
  SalesStatusBadge,
  SourceBadge,
} from "@/components/shared/status-badges";
import { AssignmentHistorySection } from "@/components/leads/assignment-history-section";
import { CommunicationLogForm } from "@/components/leads/communication-log-form";
import { LeadActionsPanel } from "@/components/leads/lead-actions-panel";
import { LeadFormDataSection } from "@/components/leads/lead-form-data-section";
import { PossibleDuplicatesSection } from "@/components/leads/possible-duplicates-section";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteLeadAction } from "@/app/actions";
import { requireSession } from "@/lib/auth";
import {
  canAddNotes,
  canAssignLeads,
  canChangeFulfilmentStatus,
  canChangeSalesStatus,
  canDeleteLeads,
  canEditContacts,
  canEditLeads,
  canMergeContacts,
} from "@/lib/permissions";
import { getAssignableUsers } from "@/services/auth.service";
import { getLeadDetail } from "@/services/leads.service";
import { findUserById } from "@/repositories/users.repository";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "" || value === "—") {
    return null;
  }
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">{label}</dt>
      <dd className="col-span-2 break-words text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function hasContactFields(contact: {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  state?: string;
  city?: string;
}) {
  return Boolean(
    contact.name ||
      contact.email ||
      contact.phone ||
      contact.whatsapp ||
      contact.company ||
      contact.jobTitle ||
      contact.country ||
      contact.state ||
      contact.city
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const user = await requireSession();
  const { leadId } = await params;

  let detail;
  try {
    detail = await getLeadDetail(user, leadId);
  } catch {
    notFound();
  }

  const users = await getAssignableUsers([detail.website._id.toHexString()]);
  const { lead, contact, website, attribution, activities, assignedUser } =
    detail;

  const actionUsers = users.map((assignee) => ({
    id: assignee._id.toHexString(),
    name: assignee.name,
  }));

  const assignmentHistory = await Promise.all(
    detail.assignmentHistory.map(async (entry) => {
      const [previousUser, newUser, changedBy] = await Promise.all([
        entry.previousUserId
          ? findUserById(entry.previousUserId.toHexString())
          : Promise.resolve(null),
        entry.newUserId
          ? findUserById(entry.newUserId.toHexString())
          : Promise.resolve(null),
        findUserById(entry.changedByUserId.toHexString()),
      ]);

      return {
        id: entry._id.toHexString(),
        previousUserName: previousUser?.name ?? "Unassigned",
        newUserName: newUser?.name ?? "Unassigned",
        changedByName: changedBy?.name ?? "System",
        createdAt: entry.createdAt.toISOString(),
      };
    })
  );

  const formFields =
    lead.formFieldValues?.map((field) => ({
      label: field.label,
      value: field.value,
      sensitive: field.sensitive,
      showOnLeadDetail: field.showOnLeadDetail,
      order: field.order,
      canonicalTarget: field.canonicalTarget,
      incomingKey: field.incomingKey,
    })) ?? [];

  const enquiryRows = [
    { label: "Website", value: website.name },
    { label: "Form", value: lead.formName },
    { label: "Service", value: lead.service },
    { label: "Category", value: lead.serviceCategory },
    { label: "Source", value: lead.sourceSystem },
    {
      label: "Lead value",
      value:
        lead.leadValue !== undefined
          ? `${lead.currency} ${lead.leadValue}`
          : undefined,
    },
    {
      label: "Created",
      value: format(lead.createdAt, "dd MMM yyyy HH:mm"),
    },
    { label: "Message", value: lead.message },
  ].filter((row) => row.value);

  const salesRows = [
    { label: "Assigned", value: assignedUser?.name ?? "Unassigned" },
    {
      label: "Next follow-up",
      value: lead.nextFollowUpAt
        ? format(lead.nextFollowUpAt, "dd MMM yyyy HH:mm")
        : undefined,
    },
    {
      label: "Confirmed",
      value: lead.confirmedAt
        ? format(lead.confirmedAt, "dd MMM yyyy HH:mm")
        : undefined,
    },
    {
      label: "Paid",
      value: lead.paidAt ? format(lead.paidAt, "dd MMM yyyy HH:mm") : undefined,
    },
    {
      label: "Converted",
      value: lead.convertedAt
        ? format(lead.convertedAt, "dd MMM yyyy HH:mm")
        : undefined,
    },
    { label: "Lost reason", value: lead.lostReason },
  ].filter((row) => row.value);

  const operationsRows = [
    {
      label: "Fulfilment",
      value: <FulfilmentStatusBadge status={lead.fulfilmentStatus} />,
    },
    {
      label: "Completed",
      value: lead.completedAt
        ? format(lead.completedAt, "dd MMM yyyy HH:mm")
        : undefined,
    },
  ].filter((row) => row.value);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Leads", href: "/leads" },
          { label: lead.leadNumber },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Lead dossier"
          title={contact.name}
          description={`${website.name} · ${lead.formName ?? "Form"}`}
          reference={lead.leadNumber}
          className="mb-0 flex-1 border-0 pb-0"
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/leads/${leadId}/edit`}>Edit page</Link>
          </Button>
          {canDeleteLeads(user.role) ? (
            <DeleteEntityButton
              label="Delete lead"
              confirmMessage={`Permanently delete lead ${lead.leadNumber}? This cannot be undone.`}
              redirectTo="/leads"
              action={deleteLeadAction.bind(null, leadId)}
            />
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <SalesStatusBadge status={lead.salesStatus} />
        <FulfilmentStatusBadge status={lead.fulfilmentStatus} />
        <PriorityBadge priority={lead.priority} />
        <SourceBadge source={lead.sourceSystem} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {hasContactFields(contact) ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
                    01 /{" "}
                  </span>
                  Contact record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <DetailRow label="Name" value={contact.name} />
                <DetailRow label="Email" value={contact.email} />
                <DetailRow label="Phone" value={contact.phone} />
                <DetailRow label="WhatsApp" value={contact.whatsapp} />
                <DetailRow label="Company" value={contact.company} />
                <DetailRow label="Job title" value={contact.jobTitle} />
                <DetailRow label="Country" value={contact.country} />
                <DetailRow label="State" value={contact.state} />
                <DetailRow label="City" value={contact.city} />
                <PossibleDuplicatesSection
                  duplicates={detail.possibleDuplicates.map((duplicate) => ({
                    id: duplicate._id.toHexString(),
                    name: duplicate.name,
                    email: duplicate.email,
                    phone: duplicate.phone,
                    company: duplicate.company,
                  }))}
                  canMerge={canMergeContacts(user.role)}
                />
                <div className="pt-2">
                  <Link
                    href={`/contacts/${contact._id.toHexString()}`}
                    className="text-sm font-medium text-[var(--ink)] underline"
                  >
                    Open contact record
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {enquiryRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Enquiry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {enquiryRows.map((row) => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <LeadFormDataSection
            formName={lead.formName}
            formCode={lead.formCode}
            schemaVersion={lead.formSchemaVersion}
            fields={formFields}
            canViewSensitive={detail.canViewSensitiveFields}
          />

          {detail.canViewAttribution ? (
            <Card>
              <CardHeader>
                <CardTitle>Marketing attribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attribution ? (
                  <>
                    <DetailRow label="GCLID" value={attribution.gclid} />
                    <DetailRow label="GBRAID" value={attribution.gbraid} />
                    <DetailRow label="WBRAID" value={attribution.wbraid} />
                    <DetailRow label="UTM source" value={attribution.utmSource} />
                    <DetailRow label="UTM medium" value={attribution.utmMedium} />
                    <DetailRow
                      label="UTM campaign"
                      value={attribution.utmCampaign}
                    />
                    <DetailRow label="UTM term" value={attribution.utmTerm} />
                    <DetailRow
                      label="UTM content"
                      value={attribution.utmContent}
                    />
                    <DetailRow
                      label="Landing page"
                      value={attribution.landingPage}
                    />
                    <DetailRow label="Form page" value={attribution.formPage} />
                    <DetailRow label="Referrer" value={attribution.referrer} />
                  </>
                ) : (
                  <p className="text-sm text-[var(--ink-muted)]">
                    No attribution captured for this submission.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {salesRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Sales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {salesRows.map((row) => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </CardContent>
            </Card>
          ) : null}

          {operationsRows.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {operationsRows.map((row) => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <AssignmentHistorySection items={assignmentHistory} />

          <CommunicationLogForm leadId={leadId} canLog={canAddNotes(user.role)} />

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No activities yet.</p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity._id.toHexString()}
                    className="border-l-2 border-[var(--border)] pl-3"
                  >
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {activity.description}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {activity.type} ·{" "}
                      {format(activity.createdAt, "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <LeadActionsPanel
          lead={{
            id: lead._id.toHexString(),
            websiteId: lead.websiteId.toHexString(),
            service: lead.service,
            serviceCategory: lead.serviceCategory,
            formName: lead.formName,
            message: lead.message,
            salesStatus: lead.salesStatus,
            fulfilmentStatus: lead.fulfilmentStatus,
            priority: lead.priority,
            leadValue: lead.leadValue,
            currency: lead.currency,
            assignedUserId: lead.assignedUserId?.toHexString(),
            lostReason: lead.lostReason,
          }}
          contact={{
            id: contact._id.toHexString(),
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            whatsapp: contact.whatsapp,
            company: contact.company,
            jobTitle: contact.jobTitle,
            country: contact.country,
            state: contact.state,
            city: contact.city,
          }}
          users={actionUsers}
          canEdit={canEditContacts(user.role) || canEditLeads(user.role)}
          canNote={canAddNotes(user.role)}
          canSales={canChangeSalesStatus(user.role)}
          canFulfilment={canChangeFulfilmentStatus(user.role)}
          canAssign={canAssignLeads(user.role)}
        />
      </div>
    </div>
  );
}
