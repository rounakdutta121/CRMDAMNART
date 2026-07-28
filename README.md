# DamnArt CRM

DamnArt CRM is a multi-website lead management, sales management and customer conversion tracking system. It is the central source of truth for leads arriving from websites, landing pages, n8n, Google Apps Script, Google Sheets, manual sales entry and future integrations.

This repository is a single Next.js application that deploys to Vercel with MongoDB Atlas (free M0) as the database.

**Production deploy:** see [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel + Atlas setup, env vars, and the post-deploy checklist.

## Technology stack

- Next.js App Router (TypeScript strict mode)
- React Server Components by default
- Route Handlers for public APIs
- Server Actions for internal CRM mutations
- Tailwind CSS + shadcn-style UI primitives
- MongoDB Atlas + official MongoDB Node.js driver
- Auth.js (Credentials + JWT)
- bcryptjs, Zod, React Hook Form-ready schemas, Lucide, Sonner, date-fns

## Architecture

```text
src/
  app/           UI routes, Server Actions, API routes
  components/    Layout, feature UI, shared primitives
  lib/           MongoDB, auth, permissions, validation, indexes
  repositories/  Database queries only
  services/      Business logic
  types/         Shared domain types
scripts/         Seed + index creation
```

Separation of concerns:

- UI never talks to MongoDB directly from client components
- Repositories own queries
- Services own workflow rules, permissions and audit/activity side effects
- Permissions are enforced on the server

## Local installation

```bash
cd damnart-crm
npm install
cp .env.example .env
```

Fill in `.env` values (see below), then:

```bash
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MongoDB Atlas M0 setup

1. Create a free M0 cluster in MongoDB Atlas.
2. Create a database user.
3. Allow network access for your IP (and `0.0.0.0/0` for Vercel if needed).
4. Copy the connection string into `MONGODB_URI`.
5. Set `MONGODB_DB=damnart_crm`.

## Environment variables

```env
MONGODB_URI=
MONGODB_DB=damnart_crm

AUTH_SECRET=
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

SEED_ADMIN_NAME=DamnArt CRM Administrator
SEED_ADMIN_EMAIL=admin@damnart.com
SEED_ADMIN_PASSWORD=ChangeThisPassword123!

APP_URL=http://localhost:3000
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Never commit real credentials.

## Commands

```bash
npm run dev            # local development
npm run seed           # create indexes + administrator
npm run create-indexes # create indexes only
npm run lint           # ESLint
npm run typecheck      # TypeScript --noEmit
npm run test           # Vitest unit tests
npm run build          # production build
npm start              # run production server
```

## Seed the administrator

```bash
npm run seed
```

The script:

1. Connects to MongoDB
2. Creates indexes idempotently
3. Creates the administrator from env vars (skips if email already exists)
4. Optionally creates a DamnArt demonstration website in non-production
5. Never prints passwords or API keys

## Milestone 2 features

Milestone 2 adds sales operations, CRM administration, dynamic form schemas, integration management, and reporting.

### CRM administration

- **User management** (`/settings/users`) — create, edit, deactivate users; assign roles and permitted websites
- **Session invalidation** — `sessionVersion` in JWT; password resets and deactivation force re-login
- **Services** (`/settings/services`) — reusable services linked to multiple websites
- **Website-level permissions** — enforced in server components, actions, route handlers, and repositories

### Multi-form architecture

Each website can have multiple forms with independent schemas:

```text
Website
  ├── Form 1 (contact-form)
  ├── Form 2 (training-enquiry)
  └── Form 3 (newsletter)
```

Manage forms at `/websites/[websiteId]/forms`. Each form has:

- Unique `code` within the website
- Dynamic field definitions with aliases and canonical CRM mapping
- `schemaMode`: `dynamic` (new) or `legacy` (existing unconfigured forms)
- `schemaVersion` incremented on schema changes (historical leads keep snapshots)
- Per-form webhook URL, default service, default owner, identity rules, unknown-field policy

### Dynamic form schema

Administrators configure fields in the form builder (`/websites/[websiteId]/forms/[formId]/edit`):

- Incoming keys and form-specific aliases (e.g. `mobile`, `phone`, `Phone-Number` → `contact.phone`)
- Canonical targets: contact, lead, attribution, `custom`, or `ignore`
- Required/optional, validation, display flags, sensitive-field masking
- Templates: Basic Contact, Service Enquiry, Training Enquiry, Newsletter, Consultation, Blank
- **Generate from sample JSON** — paste a payload; review suggested mappings before saving

Shared mapping service: `src/services/form-submission-mapper.service.ts` — used by webhooks, manual entry, CSV import, and test submissions.

### Webhook endpoints

**Preferred (form-specific):**

```text
POST /api/v1/webhooks/leads/[websiteKey]/[formCode]
```

Example:

```text
POST /api/v1/webhooks/leads/damnart-main/contact-form
```

**Legacy (website-level, still supported):**

```text
POST /api/v1/webhooks/leads/[websiteKey]
```

Legacy form resolution order: route form code → `x-form-code` header → body `formCode` → form ID → form name → default form (only when exactly one active form exists). Ambiguous submissions are rejected.

Headers:

```text
x-api-key: WEBSITE_API_KEY
x-idempotency-key: UNIQUE_SUBMISSION_ID
x-form-code: optional-form-code
```

### Form-specific curl example

```bash
curl -X POST "$APP_URL/api/v1/webhooks/leads/damnart-main/contact-form" \
  -H "Content-Type: application/json" \
  -H "x-api-key: WEBSITE_API_KEY" \
  -H "x-idempotency-key: demo-submission-002" \
  -d '{
    "fullName": "Example Person",
    "workEmail": "person@example.com",
    "phoneNum": "+919876543210",
    "reqText": "Need a quotation",
    "gclid": "example-gclid",
    "utm_source": "google",
    "utm_medium": "cpc"
  }'
```

Field names must match the form schema (or configured aliases). Unconfigured fields follow the form's `unknownFieldPolicy` (`ignore` by default).

### n8n integration

Send original native field names — no pre-renaming required:

```json
{
  "fullName": "={{ $json.body.fullName }}",
  "workEmail": "={{ $json.body.workEmail }}",
  "phoneNum": "={{ $json.body.phoneNum }}",
  "reqText": "={{ $json.body.reqText }}",
  "gclid": "={{ $json.body.gclid }}"
}
```

Use the form-specific endpoint URL. Configure matching incoming keys and aliases in the CRM form builder.

### Google Apps Script integration

Use the form-specific endpoint. Store credentials in Script Properties (never in public browser JavaScript):

```javascript
function submitLeadToDamnArtCrm(payload) {
  const url = PropertiesService.getScriptProperties().getProperty("CRM_WEBHOOK_URL");
  const apiKey = PropertiesService.getScriptProperties().getProperty("CRM_API_KEY");

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": apiKey,
      "x-idempotency-key": payload.externalSubmissionId || Utilities.getUuid(),
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  return JSON.parse(response.getContentText());
}
```

Field names in the payload must match the configured form schema.

### Sales operations

- **Lead assignment** — assign, reassign, unassign with history; bulk assignment (max 100)
- **Follow-up workspace** (`/follow-ups`) — my/team views, due today, overdue (computed dynamically), completed, cancelled
- **Communication logging** — call, email, WhatsApp, meeting with direction, outcome, optional next follow-up
- **Bulk actions** — assign, change status/priority, mark spam, export selected
- **Manual lead creation** (`/leads/new`) — select website + form; dynamic fields from schema; legacy fallback when no schema
- **CSV import** (`/leads/import`) — map columns to form fields; max 5 MB / 2,000 rows
- **CSV export** — filtered, selected, or website leads; formula-injection protection
- **Contact duplicate detection and merge** (`/contacts/duplicates`)
- **Saved lead views** — private filters and column preferences per user
- **Improved search** — lead number, contact, email, phone, GCLID, configured searchable custom fields

### Integration management

- **Integration logs** (`/settings/integrations/logs`) — safe field-name diagnostics, no request bodies or PII values stored
- **Webhook testing** (`/websites/[websiteId]/forms/[formId]/test`) — validate only or create test lead (`isTestLead: true`)
- Test leads excluded from default dashboard metrics (optional include filter)

### Dashboards

- **Global dashboard** (`/dashboard`) — filters: website, form, date range, service, owner, source, include test leads
- **Website dashboard** (`/websites/[websiteId]/dashboard`) — form/service/status breakdown, GCLID capture rate, integration failures, legacy forms

### Migrating existing forms

Existing integrations without configured schemas use `schemaMode: legacy` and continue working with the previous validation. To migrate:

1. Open the form in the CRM
2. Use **Generate from sample JSON** or apply a template
3. Review and adjust field mappings
4. Save — schema switches to `dynamic` on next save with configured fields
5. Update integrations to use the form-specific endpoint when ready

Run `npm run seed` after upgrading to apply new indexes and migrate existing users to `sessionVersion: 1`.

## Website creation process

1. Sign in as administrator
2. Open **Websites → Add website**
3. Enter name, code, domain and brand details
4. Save — a webhook key and API key are generated
5. Add forms under **Websites → [website] → Forms**
6. Configure the form schema, attribution fields, and test the webhook
7. Copy the API key immediately (shown once on create/regenerate)

Inactive websites reject new webhook submissions but keep historical leads.

## API key process

- Keys are cryptographically random (`da_` + base64url entropy)
- Only SHA-256 hashes are stored
- Plain keys are shown once on create/regenerate
- Regeneration invalidates the previous key
- Verification uses timing-safe comparison

## Webhook endpoint

```text
POST /api/v1/webhooks/leads/[websiteKey]
```

Headers:

```text
x-api-key: WEBSITE_API_KEY
x-idempotency-key: UNIQUE_SUBMISSION_ID
```

### curl example

```bash
curl -X POST "$APP_URL/api/v1/webhooks/leads/WEBSITE_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -H "x-api-key: WEBSITE_API_KEY" \
  -H "x-idempotency-key: demo-submission-001" \
  -d '{
    "sourceSystem": "n8n",
    "formName": "AI Automation Service Enquiry",
    "externalSubmissionId": "n8n-execution-12345",
    "name": "Example Person",
    "email": "person@example.com",
    "phone": "+919876543210",
    "service": "AI-Powered Lead Automation",
    "serviceCategory": "AI Automation",
    "message": "We need automated lead capture and WhatsApp follow-up.",
    "consentStatus": "granted",
    "attribution": {
      "gclid": "example-gclid",
      "utmSource": "google",
      "utmMedium": "cpc",
      "utmCampaign": "ai-lead-automation",
      "landingPage": "https://example.com/ai-lead-automation",
      "formPage": "https://example.com/contact",
      "referrer": "https://www.google.com/"
    }
  }'
```

Successful response:

```json
{
  "success": true,
  "data": {
    "leadId": "...",
    "contactId": "...",
    "leadNumber": "DA-LEAD-2026-000001",
    "idempotentReplay": false
  }
}
```

Repeated idempotency keys return the original lead with `idempotentReplay: true`.

### n8n example

1. Use an HTTP Request node
2. Method: `POST`
3. URL: `{{$env.APP_URL}}/api/v1/webhooks/leads/{{$env.WEBSITE_WEBHOOK_KEY}}`
4. Headers:
   - `x-api-key`
   - `x-idempotency-key` = execution id
5. JSON body mapped from form fields + UTM/GCLID values
6. Set `sourceSystem` to `n8n`

### Google Apps Script example

```javascript
function submitLeadToDamnArtCrm(payload) {
  const url = PropertiesService.getScriptProperties().getProperty("CRM_WEBHOOK_URL");
  const apiKey = PropertiesService.getScriptProperties().getProperty("CRM_API_KEY");

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": apiKey,
      "x-idempotency-key": payload.externalSubmissionId,
    },
    payload: JSON.stringify({
      sourceSystem: "apps_script",
      ...payload,
    }),
    muteHttpExceptions: true,
  });

  return JSON.parse(response.getContentText());
}
```

## Multi-website model

One CRM database serves every DamnArt website/brand/landing domain. Leads stay in a single `leads` collection and are partitioned by `websiteId`. Each website has:

- Unique `code`
- Unique `webhookKey` / webhook URL
- Its own API key hash
- Optional default lead owner
- Independent active/inactive state

## Roles

`super_admin`, `admin`, `sales_manager`, `sales_executive`, `operations`, `marketing`, `viewer`

Website permissions and action permissions are checked in services before mutations.

## Milestone 3 — Team invitations, assignment, monthly leads & shareable dashboards

### User invitations

- Administrators create invitations at `/settings/users/invite`
- Manage pending invitations at `/settings/users/invitations`
- Secure copyable links at `/invite/[token]` (no email provider required)
- Tokens are hashed; single-use; expiring (24h–14d); revocable
- Acceptance creates an active user with inherited role, website access and assignment flags

### Lead workspaces

- `/leads` with tabs: All, My leads, Unassigned, Team
- Dedicated routes: `/leads/my-leads`, `/leads/unassigned`, `/leads/team`
- Monthly grouped view with year navigation (`?viewMode=monthly&year=2026`)
- Server-side month aggregation and paginated month drill-down

### Notifications

- Internal CRM notifications (no email/push)
- Bell in header with unread count
- Full list at `/notifications`

### Website teams

- `/websites/[websiteId]/team` — members, assignment eligibility, open lead counts
- Add/remove website access with open-lead safeguards

### Website performance & sharing

- `/websites/[websiteId]/performance` — period presets (last week/month/year, rolling 12 months, custom)
- `/websites/[websiteId]/performance/shares` — create branded aggregate dashboards
- Public share pages at `/dashboard-share/[shareSlug]` (noindex, aggregate-only)
- Optional password protection with HTTP-only access cookies
- Access logs and share revocation

### Reporting period definitions

| Preset | Definition |
|--------|------------|
| Last 7 days | Most recent 7 calendar days including today |
| Previous 7 days | 7 days immediately before the current 7-day window |
| Last month | Complete previous calendar month (website timezone) |
| Last year | Complete previous calendar year |
| Rolling 12 months | Most recent 12-month period |

### Security

- Invitation and dashboard passwords are hashed
- Shared dashboards never expose names, emails, phones or GCLID values
- Server-side permission checks on all mutations
- MongoDB-backed password attempt tracking (no Redis)

## Current limitations

- No Google Ads API upload yet (schema prepared via `conversionEvents`)
- No background queues / Redis / cron workers
- No public self-registration
- Website creation is single-step; forms are added after website creation
- No drag-and-drop field reordering in the form builder (use move up/down)
- CSV import maps to canonical fields; full per-form dynamic column mapping is basic
- MongoDB free-tier: no multi-document transactions; integrity handled via careful ordering and idempotency
- Vercel serverless: synchronous CSV import/export and webhook processing only (no workers)

## Future Google Ads conversion-upload architecture

1. When a lead reaches milestones (`qualified`, `confirmed`, `payment_received`, `converted`, `completed`), create a `conversionEvents` document.
2. Copy GCLID/GBRAID/WBRAID from attribution without overwriting first-touch values.
3. Mark status `waiting`.
4. A later Vercel Cron or secured Route Handler will claim waiting events, call Google Ads Offline Conversion Upload, and update `submitted` / `successful` / `failed`.
5. Idempotent `transactionId` prevents duplicate uploads.

## Vercel deployment

1. Push this project to GitHub.
2. Import the repository in Vercel as one Next.js project.
3. Set the same environment variables in Vercel (use production `AUTH_URL` / `APP_URL`).
4. Deploy.
5. Run `npm run seed` once against the production database (locally with production env, or a one-off script runner).
6. Sign in and create websites / regenerate API keys as needed.

No Docker, Redis, Prisma, Supabase, Neon or separate backend is required.

## Backup recommendations

- Enable MongoDB Atlas automated backups on paid tiers, or export collections periodically via `mongodump`
- Export critical leads regularly using **Leads → Export filtered**
- Store API keys securely outside the CRM after generation

## Acceptance coverage (milestone 3)

- Secure user invitations with copyable links
- Invitation acceptance and strong password policy
- Website team management with access removal safeguards
- Lead assignment eligibility enforcement
- Internal assignment notifications
- My / Team / Unassigned lead workspaces
- Monthly lead grouping and navigation
- Website performance dashboards with Recharts
- Branded shareable aggregate dashboards
- Password-protected shares with access cookies
- Dashboard access logs
- Milestone 3 automated tests
- Lint, typecheck, and production build passing

## Production hardening (milestone 7)

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [SECURITY.md](./SECURITY.md) for full production guidance.

- Centralised environment validation (`src/lib/env.ts`)
- Structured safe logging with sensitive-field redaction
- MongoDB-backed login protection and webhook rate limiting
- Health endpoint (`GET /api/health`) and admin readiness check
- Security headers, error boundaries, export limits (10,000 rows)
- Database indexes for login attempts and rate-limit TTL cleanup
- CI workflow (`.github/workflows/ci.yml`)
- Smoke test script (`npm run smoke-test`)

## Visual redesign (milestone 8)

Archival-documentary interface applied across the CRM:

- Design tokens: warm paper surfaces, charcoal ink, muted olive accent, ochre attention, oxide danger
- Typography: Source Serif 4 (titles), IBM Plex Sans (UI), IBM Plex Mono (metadata / IDs)
- Shell: index-style sidebar, mobile navigation sheet, editorial header
- Patterns: ledger tables, mobile record cards, metric strips, dossier page headers
- Public surfaces: login, invitation acceptance, shared performance reports

## Acceptance coverage (milestone 2)

- User management with session invalidation
- Website-level permissions (all roles)
- Services management
- Multi-form websites with dynamic schemas
- Form-specific webhooks + legacy compatibility
- Shared submission mapper
- Manual lead creation from form schema
- Lead assignment history and bulk actions
- Follow-up workspace with dynamic overdue calculation
- Communication logging
- Contact duplicate detection and merge
- CSV import and export
- Integration request logs
- Webhook testing and test leads
- Saved lead views and improved search
- Global and website dashboards with filters
- Audit logging for administrative actions
- 47 automated unit tests
- Lint, typecheck, and production build passing
