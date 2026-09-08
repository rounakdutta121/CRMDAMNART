import Link from "next/link";
import {
  AI_AGENT_SCOPE_LABELS,
  AI_AGENT_SCOPES,
  type AiAgentScope,
} from "@/types/ai-agent";

const SCOPE_ROUTE_NOTES: Record<AiAgentScope, string> = {
  "leads:read": "GET /leads, GET /leads/{id}",
  "leads:write": "POST /leads, PATCH /leads/{id}",
  "leads:assign": "POST /leads/{id}/assign",
  "leads:delete": "DELETE /leads/{id}",
  "leads:import": "Reserved — no agent route yet",
  "leads:export": "Reserved — no agent route yet",
  "contacts:read": "GET /contacts, GET /contacts/{id}",
  "contacts:write": "PATCH /contacts/{id}",
  "contacts:merge": "POST /contacts/merge",
  "websites:read": "GET /websites, GET /websites/{id}",
  "websites:write": "POST /websites, PATCH /websites/{id}",
  "websites:delete": "DELETE /websites/{id} (hard delete)",
  "websites:all": "Bypass website allowlist (pair with other scopes)",
  "forms:read": "GET …/forms, GET …/forms/{id}",
  "forms:write": "POST/PATCH …/forms",
  "forms:delete": "DELETE …/forms/{id} (soft)",
  "services:read": "GET /services, GET /services/{id}",
  "services:write": "POST/PATCH/DELETE /services (DELETE is hard)",
  "analytics:read": "GET /analytics/overview",
  "users:read": "GET /users",
  "users:write": "POST /users",
};

const ENDPOINT_INDEX: { method: string; path: string; scope: string }[] = [
  { method: "GET", path: "/api/v1/agent/me", scope: "(auth only)" },
  {
    method: "GET",
    path: "/api/v1/agent/analytics/overview",
    scope: "analytics:read",
  },
  { method: "GET", path: "/api/v1/agent/leads", scope: "leads:read" },
  { method: "POST", path: "/api/v1/agent/leads", scope: "leads:write" },
  { method: "GET", path: "/api/v1/agent/leads/{leadId}", scope: "leads:read" },
  {
    method: "PATCH",
    path: "/api/v1/agent/leads/{leadId}",
    scope: "leads:write",
  },
  {
    method: "DELETE",
    path: "/api/v1/agent/leads/{leadId}",
    scope: "leads:delete",
  },
  {
    method: "POST",
    path: "/api/v1/agent/leads/{leadId}/assign",
    scope: "leads:assign",
  },
  { method: "GET", path: "/api/v1/agent/contacts", scope: "contacts:read" },
  {
    method: "GET",
    path: "/api/v1/agent/contacts/{contactId}",
    scope: "contacts:read",
  },
  {
    method: "PATCH",
    path: "/api/v1/agent/contacts/{contactId}",
    scope: "contacts:write",
  },
  {
    method: "POST",
    path: "/api/v1/agent/contacts/merge",
    scope: "contacts:merge",
  },
  { method: "GET", path: "/api/v1/agent/websites", scope: "websites:read" },
  { method: "POST", path: "/api/v1/agent/websites", scope: "websites:write" },
  {
    method: "GET",
    path: "/api/v1/agent/websites/{websiteId}",
    scope: "websites:read",
  },
  {
    method: "PATCH",
    path: "/api/v1/agent/websites/{websiteId}",
    scope: "websites:write",
  },
  {
    method: "DELETE",
    path: "/api/v1/agent/websites/{websiteId}",
    scope: "websites:delete",
  },
  {
    method: "GET",
    path: "/api/v1/agent/websites/{websiteId}/forms",
    scope: "forms:read",
  },
  {
    method: "POST",
    path: "/api/v1/agent/websites/{websiteId}/forms",
    scope: "forms:write",
  },
  {
    method: "GET",
    path: "/api/v1/agent/websites/{websiteId}/forms/{formId}",
    scope: "forms:read",
  },
  {
    method: "PATCH",
    path: "/api/v1/agent/websites/{websiteId}/forms/{formId}",
    scope: "forms:write",
  },
  {
    method: "DELETE",
    path: "/api/v1/agent/websites/{websiteId}/forms/{formId}",
    scope: "forms:delete",
  },
  { method: "GET", path: "/api/v1/agent/services", scope: "services:read" },
  { method: "POST", path: "/api/v1/agent/services", scope: "services:write" },
  {
    method: "GET",
    path: "/api/v1/agent/services/{serviceId}",
    scope: "services:read",
  },
  {
    method: "PATCH",
    path: "/api/v1/agent/services/{serviceId}",
    scope: "services:write",
  },
  {
    method: "DELETE",
    path: "/api/v1/agent/services/{serviceId}",
    scope: "services:write",
  },
  { method: "GET", path: "/api/v1/agent/users", scope: "users:read" },
  { method: "POST", path: "/api/v1/agent/users", scope: "users:write" },
];

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

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--ink)]">
      <code>{children.trim()}</code>
    </pre>
  );
}

function FieldTable({
  rows,
}: {
  rows: { field: string; type: string; required?: string; notes: string }[];
}) {
  return (
    <div className="ledger-scroll">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Required</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field}>
              <td>
                <code className="text-[var(--ink)]">{row.field}</code>
              </td>
              <td>{row.type}</td>
              <td>{row.required ?? "No"}</td>
              <td>{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({
  method,
  path,
  scope,
  children,
}: {
  method: string;
  path: string;
  scope: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          {method}
        </span>
        <code className="break-all text-sm text-[var(--ink)]">{path}</code>
      </div>
      <p className="text-xs text-[var(--ink-muted)]">
        Scope: <code className="text-[var(--ink)]">{scope}</code>
      </p>
      <div className="space-y-2 text-sm text-[var(--ink-muted)]">{children}</div>
    </div>
  );
}

export function AiAgentsApiDocs() {
  return (
    <div id="ai-agents" className="scroll-mt-24 space-y-4">
      <FeatureBlock title="Overview">
        <p>
          The AI Agent REST API lets trusted automation (Claude, Cursor agents,
          custom scripts, n8n) operate the CRM with the same business rules as
          the UI. It does <strong className="font-medium text-[var(--ink)]">not</strong>{" "}
          use website webhook keys or user passwords.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Base path: <code className="text-[var(--ink)]">/api/v1/agent</code>
          </li>
          <li>
            Auth header:{" "}
            <code className="text-[var(--ink)]">
              Authorization: Bearer da_ag_…
            </code>{" "}
            (or <code className="text-[var(--ink)]">x-api-key</code>)
          </li>
          <li>
            JSON responses:{" "}
            <code className="text-[var(--ink)]">
              {`{ "success": true, "data": … }`}
            </code>{" "}
            or{" "}
            <code className="text-[var(--ink)]">
              {`{ "success": false, "error": { "code", "message" } }`}
            </code>
          </li>
          <li>
            Manage keys in{" "}
            <DocLink href="/settings/ai-agents">Settings → AI Agents</DocLink>{" "}
            (admins only). Keys are shown once.
          </li>
        </ul>
        <Tip>
          Prefer least privilege: start with read scopes, add write scopes only
          when needed. Always grant explicit websites, or deliberately add{" "}
          <code className="text-[var(--ink)]">websites:all</code>.
        </Tip>
      </FeatureBlock>

      <FeatureBlock title="Authentication example">
        <CodeBlock>{`curl -s "$APP_URL/api/v1/agent/me" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Accept: application/json"`}</CodeBlock>
      </FeatureBlock>

      <FeatureBlock title="Scopes (permissions)">
        <p>
          Each agent is granted one or more scopes. Missing a scope returns{" "}
          <code className="text-[var(--ink)]">403 AGENT_SCOPE_DENIED</code>.
          Website-scoped data is limited to{" "}
          <code className="text-[var(--ink)]">permittedWebsiteIds</code> unless{" "}
          <code className="text-[var(--ink)]">websites:all</code> is granted.
        </p>
        <div className="ledger-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Scope</th>
                <th>What it allows</th>
                <th>Agent routes</th>
              </tr>
            </thead>
            <tbody>
              {AI_AGENT_SCOPES.map((scope) => (
                <tr key={scope}>
                  <td>
                    <code className="text-[var(--ink)]">{scope}</code>
                  </td>
                  <td>{AI_AGENT_SCOPE_LABELS[scope]}</td>
                  <td>{SCOPE_ROUTE_NOTES[scope]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Tip>
          <code className="text-[var(--ink)]">leads:import</code> and{" "}
          <code className="text-[var(--ink)]">leads:export</code> are reserved
          for future agent endpoints. CSV import/export today is session-only
          in the CRM UI.
        </Tip>
      </FeatureBlock>

      <FeatureBlock title="Endpoint index">
        <div className="ledger-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Scope</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_INDEX.map((row) => (
                <tr key={`${row.method}-${row.path}`}>
                  <td className="font-mono text-xs uppercase">{row.method}</td>
                  <td>
                    <code className="text-[var(--ink)]">{row.path}</code>
                  </td>
                  <td>
                    <code className="text-[var(--ink)]">{row.scope}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Common query filters (leads list)">
        <FieldTable
          rows={[
            {
              field: "search",
              type: "string",
              notes: "Match name, email, phone, company, or lead number",
            },
            {
              field: "websiteId",
              type: "string (ObjectId)",
              notes: "Filter to one website",
            },
            {
              field: "formId",
              type: "string",
              notes: "Filter by form",
            },
            {
              field: "status",
              type: "string",
              notes:
                "new, assigned, contacted, qualified, converted, lost, …",
            },
            {
              field: "priority",
              type: "string",
              notes: "low | normal | high | urgent",
            },
            {
              field: "sourceSystem",
              type: "string",
              notes: "website | n8n | apps_script | manual | import | agent",
            },
            {
              field: "assignedUserId",
              type: "string",
              notes: "User id",
            },
            {
              field: "service",
              type: "string",
              notes: "Service name text filter",
            },
            {
              field: "dateFrom / dateTo",
              type: "YYYY-MM-DD",
              notes: "Created-at range",
            },
            {
              field: "hasGclid",
              type: "true|false",
              notes: "Has Google click id",
            },
            {
              field: "missingAttribution",
              type: "true|false",
              notes: "Missing attribution data",
            },
            {
              field: "page / pageSize",
              type: "number",
              notes: "Pagination (page default 1)",
            },
            {
              field: "view",
              type: "string",
              notes: "my | unassigned | team",
            },
          ]}
        />
      </FeatureBlock>

      <FeatureBlock title="Identity">
        <Endpoint method="GET" path="/api/v1/agent/me" scope="any valid key">
          <p>Returns agent id, name, scopes, website access, and status.</p>
          <CodeBlock>{`curl -s "$APP_URL/api/v1/agent/me" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY"`}</CodeBlock>
        </Endpoint>
      </FeatureBlock>

      <FeatureBlock title="Analytics">
        <Endpoint
          method="GET"
          path="/api/v1/agent/analytics/overview"
          scope="analytics:read"
        >
          <p>
            Dashboard aggregates: totals, by website / status / source, recent
            leads.
          </p>
          <FieldTable
            rows={[
              {
                field: "websiteId",
                type: "string",
                notes: "Optional filter",
              },
              {
                field: "dateFrom / dateTo",
                type: "YYYY-MM-DD",
                notes: "Optional range",
              },
              {
                field: "sourceSystem",
                type: "string",
                notes: "Optional",
              },
              {
                field: "formId / service / serviceId / assignedUserId",
                type: "string",
                notes: "Optional filters",
              },
              {
                field: "includeTestLeads",
                type: '"true"',
                notes: "Pass the string true to include test leads",
              },
            ]}
          />
          <CodeBlock>{`curl -s "$APP_URL/api/v1/agent/analytics/overview?websiteId=WEBSITE_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY"`}</CodeBlock>
        </Endpoint>
      </FeatureBlock>

      <FeatureBlock title="Leads">
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/v1/agent/leads"
            scope="leads:read"
          >
            <p>Paginated lead inbox. Supports the query filters above.</p>
            <CodeBlock>{`curl -s "$APP_URL/api/v1/agent/leads?pageSize=20&status=new&search=whatsapp" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY"`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/agent/leads/{leadId}"
            scope="leads:read"
          >
            <p>Lead detail with contact, website, attribution, and activity.</p>
            <CodeBlock>{`curl -s "$APP_URL/api/v1/agent/leads/LEAD_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY"`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/leads"
            scope="leads:write"
          >
            <p>
              Create a lead. Saved with{" "}
              <code className="text-[var(--ink)]">sourceSystem: &quot;agent&quot;</code>.
              Provide at least email or phone.
            </p>
            <FieldTable
              rows={[
                {
                  field: "websiteId",
                  type: "string",
                  required: "Yes",
                  notes: "Target website ObjectId",
                },
                {
                  field: "name",
                  type: "string",
                  required: "Yes",
                  notes: "Contact name",
                },
                {
                  field: "service",
                  type: "string",
                  required: "Yes",
                  notes: "Service / interest label",
                },
                {
                  field: "status",
                  type: "string",
                  required: "Yes",
                  notes: "Usually new",
                },
                {
                  field: "email",
                  type: "string",
                  notes: "Required if phone empty",
                },
                {
                  field: "phone",
                  type: "string",
                  notes: "Required if email empty",
                },
                {
                  field: "whatsapp",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "company / country / state / city",
                  type: "string",
                  notes: "Optional contact fields",
                },
                {
                  field: "formName",
                  type: "string",
                  notes: "Optional label",
                },
                {
                  field: "message",
                  type: "string",
                  notes: "Optional notes",
                },
                {
                  field: "priority",
                  type: "string",
                  notes: "low | normal | high | urgent (default normal)",
                },
                {
                  field: "currency",
                  type: "string(3)",
                  notes: "Default INR",
                },
                {
                  field: "assignedUserId",
                  type: "string",
                  notes: "Optional assignee",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/leads" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "websiteId": "WEBSITE_ID",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+919876543210",
    "service": "Consultation",
    "message": "Interested in pricing",
    "status": "new",
    "priority": "normal"
  }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="PATCH"
            path="/api/v1/agent/leads/{leadId}"
            scope="leads:write"
          >
            <FieldTable
              rows={[
                {
                  field: "status",
                  type: "string",
                  notes: "Pipeline status",
                },
                {
                  field: "priority",
                  type: "string",
                  notes: "low | normal | high | urgent",
                },
                {
                  field: "service",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "formName",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "message",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "currency",
                  type: "string(3)",
                  notes: "Optional",
                },
                {
                  field: "assignedUserId",
                  type: "string|null",
                  notes:
                    "Optional via leads:write; prefer POST …/assign for assignment-only",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X PATCH "$APP_URL/api/v1/agent/leads/LEAD_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "qualified", "priority": "high" }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/leads/{leadId}/assign"
            scope="leads:assign"
          >
            <FieldTable
              rows={[
                {
                  field: "assignedUserId",
                  type: "string|null",
                  required: "Yes",
                  notes: "User id, or null/empty to unassign",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/leads/LEAD_ID/assign" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "assignedUserId": "USER_ID" }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="DELETE"
            path="/api/v1/agent/leads/{leadId}"
            scope="leads:delete"
          >
            <p>Permanently deletes the lead (and orphan contact if unused).</p>
            <CodeBlock>{`curl -s -X DELETE "$APP_URL/api/v1/agent/leads/LEAD_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY"`}</CodeBlock>
          </Endpoint>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Contacts">
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/v1/agent/contacts"
            scope="contacts:read"
          >
            <FieldTable
              rows={[
                {
                  field: "search",
                  type: "string",
                  notes: "Optional name/email/phone search",
                },
                {
                  field: "page / pageSize",
                  type: "number",
                  notes: "Pagination",
                },
              ]}
            />
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/agent/contacts/{contactId}"
            scope="contacts:read"
          >
            <p>Contact plus related leads the agent can see.</p>
          </Endpoint>

          <Endpoint
            method="PATCH"
            path="/api/v1/agent/contacts/{contactId}"
            scope="contacts:write"
          >
            <FieldTable
              rows={[
                {
                  field: "name",
                  type: "string",
                  required: "Yes",
                  notes: "Always send current or new name",
                },
                {
                  field: "email",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "phone / whatsapp",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "company / country / state / city",
                  type: "string",
                  notes: "Optional",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X PATCH "$APP_URL/api/v1/agent/contacts/CONTACT_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Acme",
    "city": "Chandigarh"
  }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/contacts/merge"
            scope="contacts:merge"
          >
            <FieldTable
              rows={[
                {
                  field: "primaryContactId",
                  type: "string",
                  required: "Yes",
                  notes: "Survivor contact",
                },
                {
                  field: "secondaryContactId",
                  type: "string",
                  required: "Yes",
                  notes: "Merged away",
                },
                {
                  field: "preserveFrom",
                  type: "primary|secondary",
                  notes: "Default primary",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/contacts/merge" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "primaryContactId": "PRIMARY_ID",
    "secondaryContactId": "SECONDARY_ID",
    "preserveFrom": "primary"
  }'`}</CodeBlock>
          </Endpoint>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Websites">
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/v1/agent/websites"
            scope="websites:read"
          >
            <p>
              Lists active websites by default. Pass{" "}
              <code className="text-[var(--ink)]">includeInactive=true</code> to
              include soft-deleted sites.
            </p>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/agent/websites/{websiteId}"
            scope="websites:read"
          >
            <p>Single website (API key hash never returned).</p>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/websites"
            scope="websites:write"
          >
            <p>
              Creates a website and returns the website webhook{" "}
              <code className="text-[var(--ink)]">apiKey</code> once. Requires{" "}
              <code className="text-[var(--ink)]">websites:all</code> in
              addition to <code className="text-[var(--ink)]">websites:write</code>.
            </p>
            <FieldTable
              rows={[
                {
                  field: "name",
                  type: "string",
                  required: "Yes",
                  notes: "Display name",
                },
                {
                  field: "code",
                  type: "string",
                  required: "Yes",
                  notes: "Unique slug (letters, numbers, - _)",
                },
                {
                  field: "primaryDomain",
                  type: "string",
                  required: "Yes",
                  notes: "e.g. example.com",
                },
                {
                  field: "additionalDomains",
                  type: "string[]",
                  notes: "Optional",
                },
                {
                  field: "brandName / businessDivision",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "defaultCurrency",
                  type: "string(3)",
                  notes: "Default INR",
                },
                {
                  field: "timezone",
                  type: "string",
                  notes: "Default Asia/Kolkata",
                },
                {
                  field: "defaultLeadOwnerId",
                  type: "string",
                  notes: "Optional user id",
                },
                {
                  field: "isActive",
                  type: "boolean",
                  notes: "Default true",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/websites" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "New Brand Site",
    "code": "new_brand",
    "primaryDomain": "newbrand.example.com",
    "brandName": "New Brand",
    "defaultCurrency": "INR",
    "timezone": "Asia/Kolkata"
  }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="PATCH"
            path="/api/v1/agent/websites/{websiteId}"
            scope="websites:write"
          >
            <p>Partial update — same fields as create (all optional).</p>
            <CodeBlock>{`curl -s -X PATCH "$APP_URL/api/v1/agent/websites/WEBSITE_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "brandName": "Updated Brand", "isActive": true }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="DELETE"
            path="/api/v1/agent/websites/{websiteId}"
            scope="websites:delete"
          >
            <p>
              Permanently deletes the website from the database (and its forms /
              shares). Fails if the website still has leads — deactivate via
              edit instead when you only want to stop ingest.
            </p>
          </Endpoint>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Forms">
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/v1/agent/websites/{websiteId}/forms"
            scope="forms:read"
          >
            <p>List forms for a website.</p>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/agent/websites/{websiteId}/forms/{formId}"
            scope="forms:read"
          >
            <p>Form detail including field schema.</p>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/websites/{websiteId}/forms"
            scope="forms:write"
          >
            <p>
              <code className="text-[var(--ink)]">websiteId</code> is taken from
              the URL path (you do not need it in the JSON body).
            </p>
            <FieldTable
              rows={[
                {
                  field: "name",
                  type: "string",
                  required: "Yes",
                  notes: "Form display name",
                },
                {
                  field: "code",
                  type: "string",
                  required: "Yes",
                  notes: "Unique within website",
                },
                {
                  field: "description / pageUrl",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "templateId",
                  type: "string",
                  notes: "Default basic_contact",
                },
                {
                  field: "defaultServiceId",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "defaultLeadOwnerId",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "unknownFieldPolicy",
                  type: "string",
                  notes: "ignore | reject | record_field_names (default ignore)",
                },
                {
                  field: "contactIdentityRule",
                  type: "string",
                  notes:
                    "email_or_phone | email_required | phone_required | email_and_phone | none",
                },
                {
                  field: "attributionEnabled",
                  type: "boolean",
                  notes: "Default true",
                },
                {
                  field: "isActive",
                  type: "boolean",
                  notes: "Default true",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/websites/WEBSITE_ID/forms" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Contact form",
    "code": "contact-form",
    "templateId": "basic_contact"
  }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="PATCH"
            path="/api/v1/agent/websites/{websiteId}/forms/{formId}"
            scope="forms:write"
          >
            <p>
              Partial update. May include{" "}
              <code className="text-[var(--ink)]">fields</code> array for schema
              edits (advanced).
            </p>
            <CodeBlock>{`curl -s -X PATCH "$APP_URL/api/v1/agent/websites/WEBSITE_ID/forms/FORM_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Contact form (updated)", "isActive": true }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="DELETE"
            path="/api/v1/agent/websites/{websiteId}/forms/{formId}"
            scope="forms:delete"
          >
            <p>Deactivates the form (soft delete).</p>
          </Endpoint>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Services">
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/v1/agent/services"
            scope="services:read"
          >
            <p>
              Optional query:{" "}
              <code className="text-[var(--ink)]">?websiteId=…</code>
            </p>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/agent/services/{serviceId}"
            scope="services:read"
          >
            <p>Single service record.</p>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/services"
            scope="services:write"
          >
            <FieldTable
              rows={[
                {
                  field: "name",
                  type: "string",
                  required: "Yes",
                  notes: "Display name",
                },
                {
                  field: "code",
                  type: "string",
                  required: "Yes",
                  notes: "Unique code",
                },
                {
                  field: "websiteIds",
                  type: "string[]",
                  required: "Yes",
                  notes: "At least one website",
                },
                {
                  field: "category / description",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "defaultLeadValue",
                  type: "number",
                  notes: "Optional",
                },
                {
                  field: "defaultCurrency",
                  type: "string(3)",
                  notes: "Default INR",
                },
                {
                  field: "defaultLeadOwnerId",
                  type: "string",
                  notes: "Optional",
                },
                {
                  field: "isActive",
                  type: "boolean",
                  notes: "Default true",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/services" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Liposuction",
    "code": "liposuction",
    "websiteIds": ["WEBSITE_ID"],
    "defaultCurrency": "INR",
    "isActive": true
  }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="PATCH"
            path="/api/v1/agent/services/{serviceId}"
            scope="services:write"
          >
            <p>Partial update (code cannot change). Same fields as create.</p>
            <CodeBlock>{`curl -s -X PATCH "$APP_URL/api/v1/agent/services/SERVICE_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "description": "Updated catalogue entry", "isActive": true }'`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="DELETE"
            path="/api/v1/agent/services/{serviceId}"
            scope="services:write"
          >
            <p>
              Permanently deletes the service from the database and clears form
              defaults that pointed at it.
            </p>
            <CodeBlock>{`curl -s -X DELETE "$APP_URL/api/v1/agent/services/SERVICE_ID" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY"`}</CodeBlock>
          </Endpoint>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Users">
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/v1/agent/users"
            scope="users:read"
          >
            <p>Lists CRM users (password hashes never included).</p>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/agent/users"
            scope="users:write"
          >
            <p>
              Creates a CRM user. Agents cannot create{" "}
              <code className="text-[var(--ink)]">admin</code> or{" "}
              <code className="text-[var(--ink)]">super_admin</code>. Without{" "}
              <code className="text-[var(--ink)]">websites:all</code>,{" "}
              <code className="text-[var(--ink)]">permittedWebsiteIds</code>{" "}
              must be inside the agent allowlist.
            </p>
            <FieldTable
              rows={[
                {
                  field: "name",
                  type: "string",
                  required: "Yes",
                  notes: "Display name",
                },
                {
                  field: "email",
                  type: "string",
                  required: "Yes",
                  notes: "Login email",
                },
                {
                  field: "password",
                  type: "string",
                  required: "Yes",
                  notes: "Must meet strong password policy",
                },
                {
                  field: "role",
                  type: "string",
                  required: "Yes",
                  notes:
                    "sales_manager | sales_executive | operations | marketing | viewer",
                },
                {
                  field: "permittedWebsiteIds",
                  type: "string[]",
                  notes: "Website access list (constrained to agent allowlist)",
                },
                {
                  field: "canReceiveLeadAssignments",
                  type: "boolean",
                  notes: "Default true",
                },
                {
                  field: "canViewUnassignedLeads",
                  type: "boolean",
                  notes: "Default false",
                },
                {
                  field: "isActive",
                  type: "boolean",
                  notes: "Default true",
                },
              ]}
            />
            <CodeBlock>{`curl -s -X POST "$APP_URL/api/v1/agent/users" \\
  -H "Authorization: Bearer da_ag_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Sales User",
    "email": "sales@example.com",
    "password": "StrongPass!2026",
    "role": "sales_executive",
    "permittedWebsiteIds": ["WEBSITE_ID"],
    "canReceiveLeadAssignments": true,
    "isActive": true
  }'`}</CodeBlock>
          </Endpoint>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Error codes">
        <div className="ledger-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>HTTP</th>
                <th>code</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>401</td>
                <td>
                  <code>AGENT_UNAUTHORIZED</code>
                </td>
                <td>Missing or invalid API key</td>
              </tr>
              <tr>
                <td>403</td>
                <td>
                  <code>AGENT_SCOPE_DENIED</code>
                </td>
                <td>Key lacks required scope</td>
              </tr>
              <tr>
                <td>403</td>
                <td>
                  <code>AGENT_INACTIVE</code> / <code>AGENT_EXPIRED</code>
                </td>
                <td>Agent deactivated or expired</td>
              </tr>
              <tr>
                <td>403</td>
                <td>
                  <code>PERMISSION_DENIED</code>
                </td>
                <td>CRM role/website rule blocked the action</td>
              </tr>
              <tr>
                <td>404</td>
                <td>
                  <code>NOT_FOUND</code>
                </td>
                <td>Record does not exist</td>
              </tr>
              <tr>
                <td>429</td>
                <td>
                  <code>AGENT_RATE_LIMITED</code>
                </td>
                <td>Too many requests</td>
              </tr>
              <tr>
                <td>400</td>
                <td>
                  <code>VALIDATION_ERROR</code>
                </td>
                <td>Invalid JSON body / fields</td>
              </tr>
            </tbody>
          </table>
        </div>
      </FeatureBlock>

      <FeatureBlock title="Safety notes for agents">
        <ul className="list-disc space-y-1 pl-5">
          <li>Never log or commit API keys.</li>
          <li>
            Do not reuse website webhook{" "}
            <code className="text-[var(--ink)]">da_…</code> keys here — only{" "}
            <code className="text-[var(--ink)]">da_ag_…</code> agent keys.
          </li>
          <li>
            Rotate keys in{" "}
            <DocLink href="/settings/ai-agents">AI Agents</DocLink> after
            suspected exposure.
          </li>
          <li>
            Live lead data is shared with production — prefer disposable test
            records when experimenting.
          </li>
        </ul>
      </FeatureBlock>
    </div>
  );
}
