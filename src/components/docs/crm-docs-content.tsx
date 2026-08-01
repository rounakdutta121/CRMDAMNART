import Link from "next/link";
import { ArchivePanel, ReportSection } from "@/components/shared/archive";

export const DOC_MODULES = [
  { id: "getting-started", label: "Getting started", number: "00" },
  { id: "command", label: "Command", number: "01" },
  { id: "leads", label: "Leads", number: "02" },
  { id: "contacts", label: "Contacts", number: "03" },
  { id: "websites", label: "Websites & forms", number: "04" },
  { id: "performance", label: "Performance & shares", number: "05" },
  { id: "services", label: "Services", number: "06" },
  { id: "users", label: "Users & invitations", number: "07" },
  { id: "integrations", label: "Integrations", number: "08" },
  { id: "reference", label: "Reference", number: "09" },
  { id: "permissions", label: "Who can do what", number: "10" },
] as const;

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-[var(--ink)] underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--ink)]"
    >
      {children}
    </Link>
  );
}

function HowTo({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-[var(--ink)]">
      {steps.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-muted)]">
      {children}
    </p>
  );
}

function FeatureBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-editorial text-base font-semibold text-[var(--ink)]">
        {title}
      </h3>
      <div className="space-y-2 text-sm text-[var(--ink-muted)]">{children}</div>
    </div>
  );
}

export function CrmDocsContent() {
  return (
    <div className="space-y-6">
      <ArchivePanel>
        <ReportSection
          number="00 / Orientation"
          title="Getting started"
          className="scroll-mt-24"
        >
          <div id="getting-started" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="What DamnArt CRM is">
              <p>
                DamnArt CRM is the central place to capture, assign, and work
                website leads across multiple brands. Leads arrive from website
                forms (via webhook), n8n, Google Apps Script, CSV import, or
                manual entry.
              </p>
            </FeatureBlock>

            <FeatureBlock title="Sign in and session">
              <p>
                Open the CRM URL and sign in with the email and password provided
                by your administrator. If your session was invalidated (for
                example after a password reset or deactivation), you will be
                asked to sign in again.
              </p>
            </FeatureBlock>

            <FeatureBlock title="Sidebar layout">
              <p>The left sidebar is grouped into four areas:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-[var(--ink)]">Command</strong> —
                  Dashboard, Notifications, Docs
                </li>
                <li>
                  <strong className="text-[var(--ink)]">Records</strong> — Leads,
                  My leads, Contacts
                </li>
                <li>
                  <strong className="text-[var(--ink)]">Sources</strong> —
                  Websites, Services (admins)
                </li>
                <li>
                  <strong className="text-[var(--ink)]">Administration</strong> —
                  Users, invitations, integrations, roles, lead statuses
                </li>
              </ul>
              <Tip>
                Menu items you are not allowed to use are hidden. Super
                administrators see every website; other roles only see websites
                assigned to their account.
              </Tip>
            </FeatureBlock>

            <FeatureBlock title="Global search and notifications">
              <p>
                Use the header search box to jump to leads by name, email, phone,
                or lead number. The bell shows unread notifications (new
                assignments, invitations, and similar events). Open{" "}
                <DocLink href="/notifications">Notifications</DocLink> for the
                full list.
              </p>
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="01 / Command" title="Dashboard & notifications">
          <div id="command" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Dashboard">
              <p>
                The <DocLink href="/dashboard">Dashboard</DocLink> shows pipeline
                counts (total, new, unassigned, converted, and status
                breakdowns), recent leads, and distribution by website, status,
                and source.
              </p>
              <HowTo
                steps={[
                  <>Open Command → Dashboard.</>,
                  <>
                    Narrow results with website, form, date range, service,
                    owner, source, or test-lead filters.
                  </>,
                  <>
                    Click a metric or recent lead row to open the matching leads
                    list or lead record.
                  </>,
                ]}
              />
            </FeatureBlock>

            <FeatureBlock title="Notifications">
              <p>
                <DocLink href="/notifications">Notifications</DocLink> lists
                in-app alerts such as new lead arrivals and assignment changes.
              </p>
              <HowTo
                steps={[
                  <>Open Command → Notifications (or the header bell).</>,
                  <>Click an item to open the related record.</>,
                  <>Use Mark all read when you have caught up.</>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="02 / Records" title="Leads">
          <div id="leads" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Lead inbox">
              <p>
                <DocLink href="/leads">Leads</DocLink> is the main work queue.
                Use tabs for All, My, Unassigned, and Team views (availability
                depends on your role). Switch between table and monthly grouping
                when you need a calendar-style scan.
              </p>
              <HowTo
                steps={[
                  <>Open Records → Leads (or My leads for your queue).</>,
                  <>
                    Filter by search, website, form, status, priority, source,
                    assignee, dates, GCLID, or service.
                  </>,
                  <>
                    Save a filter combination as a saved view if you reuse it
                    often.
                  </>,
                  <>
                    Select rows for bulk assign or status updates when your role
                    allows it.
                  </>,
                ]}
              />
              <Tip>
                Sales executives typically see assigned leads (and unassigned if
                enabled on their account). Managers and admins can work team and
                unassigned queues.
              </Tip>
            </FeatureBlock>

            <FeatureBlock title="Create and import leads">
              <p>
                Create a lead manually from a website form schema, or import a
                CSV when your role allows import.
              </p>
              <HowTo
                steps={[
                  <>
                    From the leads page, choose New lead → pick website and form
                    → fill required fields → save.
                  </>,
                  <>
                    For CSV: open Import, map columns, preview rows, then
                    confirm. Invalid rows are reported before commit.
                  </>,
                  <>
                    Export filtered leads to CSV when you need offline reporting
                    (export is role-gated).
                  </>,
                ]}
              />
            </FeatureBlock>

            <FeatureBlock title="Lead detail">
              <p>
                Opening a lead shows contact details, pipeline status, priority,
                assignee, submitted form fields, marketing attribution, activity
                history, and assignment history.
              </p>
              <HowTo
                steps={[
                  <>Update status and priority as the conversation progresses.</>,
                  <>Assign or reassign the owner when your role allows.</>,
                  <>
                    Review form field values and attribution (GCLID / UTM) for
                    campaign context.
                  </>,
                  <>
                    Admins can delete a lead when it is spam or a true
                    duplicate that should not remain in reports.
                  </>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="03 / Records" title="Contacts">
          <div id="contacts" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Contact directory">
              <p>
                Contacts are people linked to one or more leads. They are usually
                created automatically when a lead arrives.
              </p>
              <HowTo
                steps={[
                  <>
                    Open Records → <DocLink href="/contacts">Contacts</DocLink>.
                  </>,
                  <>Search by name, email, phone, or company.</>,
                  <>
                    Open a contact to edit profile fields and see related leads.
                  </>,
                ]}
              />
            </FeatureBlock>

            <FeatureBlock title="Duplicates">
              <p>
                Managers and admins can review possible duplicates and merge
                them so one person keeps a single contact record.
              </p>
              <HowTo
                steps={[
                  <>
                    Open{" "}
                    <DocLink href="/contacts/duplicates">
                      Contacts → Duplicates
                    </DocLink>
                    .
                  </>,
                  <>Review suggested matches and choose the surviving contact.</>,
                  <>Confirm the merge; related leads point to the kept contact.</>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="04 / Sources" title="Websites & forms">
          <div id="websites" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Websites">
              <p>
                Each website (or brand property) is a source container for forms,
                webhooks, dashboards, performance, shares, and team access.
              </p>
              <HowTo
                steps={[
                  <>
                    Open Sources → <DocLink href="/websites">Websites</DocLink>.
                  </>,
                  <>
                    Admins create a website with name, domain, timezone, and
                    brand details.
                  </>,
                  <>
                    On the website detail page, copy the webhook URL and webhook
                    key for n8n / Apps Script / custom posts.
                  </>,
                  <>
                    Generate an API key when needed; the full key is shown once —
                    store it securely.
                  </>,
                ]}
              />
            </FeatureBlock>

            <FeatureBlock title="Forms">
              <p>
                Forms define the fields accepted from the website and how they
                map into CRM leads.
              </p>
              <HowTo
                steps={[
                  <>From a website, open Forms → create or edit a form.</>,
                  <>
                    Configure fields, aliases, templates, and sample JSON for
                    integrators.
                  </>,
                  <>
                    Use the form test tools to validate a payload or create a
                    marked test lead without polluting live reporting.
                  </>,
                  <>Rename or delete forms from the form detail controls.</>,
                ]}
              />
              <Tip>
                Test leads are excluded from shared client dashboards and most
                performance aggregates when “exclude test” is active.
              </Tip>
            </FeatureBlock>

            <FeatureBlock title="Website dashboard and team">
              <p>
                Each website has its own pipeline dashboard and a Team page for
                who can receive assignments on that site.
              </p>
              <HowTo
                steps={[
                  <>Open a website → Dashboard for site-level metrics.</>,
                  <>
                    Open Team (admins) to manage members and assignment
                    eligibility. Transfer or unassign open leads before removing
                    access when prompted.
                  </>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="05 / Sources" title="Performance & shares">
          <div id="performance" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Website performance">
              <p>
                Performance reports show period-based metrics, lead trends,
                status breakdown, and source analysis for a website.
              </p>
              <HowTo
                steps={[
                  <>Open a website → Performance.</>,
                  <>
                    Pick a period preset (this month, last 7 days, custom, and
                    more).
                  </>,
                  <>
                    Review key metrics and charts. Viewers cannot open
                    performance reports.
                  </>,
                ]}
              />
            </FeatureBlock>

            <FeatureBlock title="Shared client dashboards">
              <p>
                Shares create a branded public link clients can open without a
                CRM login. The shared page includes aggregate metrics and a
                paginated lead-details table for the selected period.
              </p>
              <HowTo
                steps={[
                  <>
                    From Performance → Shares → New share, set title, period,
                    branding, and optional password.
                  </>,
                  <>
                    Copy the public link and send it to the client. They unlock
                    with the password when protection is enabled.
                  </>,
                  <>
                    To stop access: Revoke share. After revoke, Delete share to
                    remove it permanently.
                  </>,
                ]}
              />
              <Tip>
                Super admins can revoke or delete any share. Admins can only
                revoke/delete their own shares and shares created by people in
                roles below admin. Always revoke before delete.
              </Tip>
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="06 / Sources" title="Services">
          <div id="services" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Service catalogue">
              <p>
                Services are named offerings used on forms and manual leads so
                reporting stays consistent across websites.
              </p>
              <HowTo
                steps={[
                  <>
                    Admins open Sources →{" "}
                    <DocLink href="/settings/services">Services</DocLink>.
                  </>,
                  <>Create, rename, or deactivate services as your catalogue changes.</>,
                  <>
                    Map form fields or defaults to a service so inbound leads
                    carry the right label.
                  </>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="07 / Administration" title="Users & invitations">
          <div id="users" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Users">
              <p>
                Admins manage CRM accounts: role, permitted websites, whether
                the user can receive assignments, and whether they can see
                unassigned leads.
              </p>
              <HowTo
                steps={[
                  <>
                    Open Administration →{" "}
                    <DocLink href="/settings/users">Users</DocLink>.
                  </>,
                  <>
                    Create a user or open an existing account to edit name,
                    email, role, and website access.
                  </>,
                  <>
                    Reset a password from the user detail actions when needed.
                  </>,
                  <>
                    Deactivate users who should no longer sign in. You cannot
                    deactivate your own account.
                  </>,
                ]}
              />
              <Tip>
                Only a super administrator can create, edit, deactivate, or
                reset passwords for other super administrators, or assign the
                super admin role.
              </Tip>
            </FeatureBlock>

            <FeatureBlock title="Invitations">
              <p>
                Invitations let someone set their own password and join with a
                pre-selected role and website access.
              </p>
              <HowTo
                steps={[
                  <>
                    Open{" "}
                    <DocLink href="/settings/users/invite">Invite user</DocLink>{" "}
                    or Administration →{" "}
                    <DocLink href="/settings/users/invitations">
                      Invitations
                    </DocLink>
                    .
                  </>,
                  <>
                    Enter email, role, websites, and expiry. Share the invite
                    link securely.
                  </>,
                  <>
                    The invitee opens the link, sets a password, and lands in
                    the CRM.
                  </>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="08 / Administration" title="Integrations">
          <div id="integrations" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Webhooks">
              <p>
                Website form submissions post to the CRM webhook URL with the
                website webhook key. Use n8n, Google Apps Script, or any HTTP
                client that can send JSON.
              </p>
              <HowTo
                steps={[
                  <>
                    Open Administration →{" "}
                    <DocLink href="/settings/integrations">Integrations</DocLink>{" "}
                    (or copy credentials from the website detail page).
                  </>,
                  <>
                    Point your automation at the webhook URL and include the
                    webhook key as required by the integration docs on that
                    page.
                  </>,
                  <>
                    Submit a test from the form tools, then confirm a lead
                    appears in the inbox.
                  </>,
                ]}
              />
            </FeatureBlock>

            <FeatureBlock title="Integration logs">
              <p>
                Admins and marketing can inspect webhook delivery history to
                debug failed or rejected payloads.
              </p>
              <HowTo
                steps={[
                  <>
                    Open{" "}
                    <DocLink href="/settings/integrations/logs">
                      Integration logs
                    </DocLink>
                    .
                  </>,
                  <>Filter by website or outcome and open a log for payload detail.</>,
                ]}
              />
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="09 / Reference" title="Roles & lead statuses">
          <div id="reference" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Roles">
              <p>
                Roles are fixed permission profiles. See{" "}
                <DocLink href="/settings/roles">Roles</DocLink> for the short
                summary of each role. Permissions are always enforced on the
                server, even if a UI control is somehow triggered.
              </p>
            </FeatureBlock>

            <FeatureBlock title="Lead statuses">
              <p>
                The pipeline uses one status field per lead (from New through
                Converted, Lost, Duplicate, or Spam). The full list lives at{" "}
                <DocLink href="/settings/lead-statuses">Lead statuses</DocLink>.
                Update status on the lead detail page as the deal progresses.
              </p>
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>

      <ArchivePanel>
        <ReportSection number="10 / Permissions" title="Who can do what">
          <div id="permissions" className="scroll-mt-24 space-y-4">
            <FeatureBlock title="Quick matrix">
              <div className="ledger-scroll">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th>Who</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>All websites</td>
                      <td>Super administrator only</td>
                    </tr>
                    <tr>
                      <td>Users, invitations, websites, forms, services</td>
                      <td>Super administrator, Administrator</td>
                    </tr>
                    <tr>
                      <td>Assign / transfer / bulk / import / merge contacts</td>
                      <td>Admins + Sales manager</td>
                    </tr>
                    <tr>
                      <td>Create / edit leads, receive assignments</td>
                      <td>Above + Sales executive</td>
                    </tr>
                    <tr>
                      <td>Change status / notes</td>
                      <td>Above + Operations</td>
                    </tr>
                    <tr>
                      <td>Attribution, export, shares, integration logs</td>
                      <td>Marketing (plus admins / managers as listed)</td>
                    </tr>
                    <tr>
                      <td>Website performance</td>
                      <td>Everyone except Viewer</td>
                    </tr>
                    <tr>
                      <td>Revoke / delete dashboard shares</td>
                      <td>
                        Super admin (any); Admin (own + lower roles&apos; shares)
                      </td>
                    </tr>
                    <tr>
                      <td>Read-only browsing</td>
                      <td>Viewer (and marketing for many write actions)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Tip>
                If a button is missing or an action fails with a permission
                message, your role or website access does not include that
                operation. Ask an administrator to adjust your account.
              </Tip>
            </FeatureBlock>
          </div>
        </ReportSection>
      </ArchivePanel>
    </div>
  );
}

export function CrmDocsToc() {
  return (
    <nav aria-label="Documentation modules" className="space-y-1">
      <p className="mb-3 font-meta text-[0.6875rem] text-[var(--ink-subtle)]">
        Modules
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {DOC_MODULES.map((module) => (
          <li key={module.id} className="shrink-0">
            <a
              href={`#${module.id}`}
              className="block border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--ink)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)] lg:border-transparent lg:bg-transparent lg:px-2 lg:py-1.5 lg:hover:bg-transparent lg:hover:underline"
            >
              <span className="font-meta text-[0.625rem] text-[var(--ink-subtle)]">
                {module.number}
              </span>{" "}
              {module.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
