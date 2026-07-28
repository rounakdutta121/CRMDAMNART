# Security Policy

## Supported Environment

DamnArt CRM is designed to run as a single Next.js application on Vercel with MongoDB Atlas. Supported runtimes:

- Node.js (server routes, Server Actions, webhooks)
- MongoDB Atlas (official Node.js driver)

Redis, external queues, separate workers, and third-party auth providers are not part of the supported security model.

## Reporting a Vulnerability

If you discover a security issue, report it privately to your DamnArt CRM administrator or internal security contact. Do not open public issues containing exploit details, credentials, or customer data.

Include:

- Affected route or feature
- Steps to reproduce
- Impact assessment
- Suggested remediation if known

## Authentication Overview

- Auth.js with JWT sessions (12-hour max age)
- Credentials provider with bcrypt password hashes (cost 12)
- `sessionVersion` on users invalidates sessions after password reset or administrative invalidation
- Protected CRM routes require a valid session via middleware
- Sensitive server operations re-load the user from MongoDB and verify active status, role, and `sessionVersion`

## Login Protection

- MongoDB-backed login attempt tracking (no plain passwords stored)
- Identifier hashing (email-based, privacy-safe)
- Default policy: 5 failed attempts within 15 minutes → 15-minute temporary block
- Configurable via `LOGIN_MAX_ATTEMPTS` and `LOGIN_BLOCK_MINUTES`
- Login errors do not reveal whether an email exists

## Role and Website Isolation

- Every website-scoped query must respect the caller's permitted websites
- Super administrators may access all websites; other roles are restricted to assigned website IDs
- Lead, contact, export, dashboard, and form operations verify website scope server-side
- Client-side UI restrictions are not trusted for authorization

### Contact Access Policy

- Contacts may have leads across multiple websites
- Users may view a contact only when they can access at least one related lead through a permitted website
- Contact detail pages must not expose leads from unauthorised websites
- Contact merge requires access to every affected website

## Public Webhook Authentication

- Each website has a unique webhook key (URL path) and API key (header)
- API keys are stored as SHA-256 hashes only
- Verification uses constant-time comparison where practical
- Inactive websites and forms reject submissions
- Request body size is limited
- MongoDB-backed rate limiting (default: 60/minute, 300/hour per website)
- Idempotency keys prevent duplicate lead creation on retries

## API Key Rotation

Regenerate website API keys from the CRM after suspected compromise. Old keys stop working immediately after regeneration. Update all integrations (forms, n8n, Apps Script) with the new key.

## Invitation Security

- Tokens are cryptographically random; only token hashes are stored
- Invitations are single-use and expire
- Revoked or accepted invitations cannot be reused
- Regenerating an invitation invalidates previous tokens
- Invitees cannot change role or website access during acceptance
- Invitation acceptance is rate-limited
- Invitation pages use `noindex`

## Shared Dashboard Security

- Share slugs are unguessable random values
- Revoked and expired shares are inaccessible
- Optional password protection with bcrypt hashes
- Access cookies are signed, HTTP-only, and scoped to the share
- Password attempts are rate-limited
- Public dashboards return aggregate metrics only — no names, emails, phones, GCLIDs, or lead messages
- Public dashboards use `noindex` headers

## Secret Handling

Never commit:

- `.env` files
- MongoDB connection strings
- `AUTH_SECRET`
- API keys
- Invitation tokens
- Dashboard share passwords

Passwords, API keys, and tokens must never appear in logs, audit entries, or client responses.

## Logging Rules

Structured server logging redacts sensitive keys including `password`, `token`, `apiKey`, `authorization`, `email`, `phone`, and attribution identifiers. Do not log full request bodies or MongoDB documents in production.

## Data Retention

- Rate-limit and login-attempt records use TTL cleanup
- Audit logs, integration logs, and leads are retained until explicitly managed
- Expired invitations may be cleaned up through maintenance processes
- Contact anonymisation and export utilities support privacy requests where implemented

## Backup Expectations

Use MongoDB Atlas backups appropriate to your tier. Test restore procedures periodically. Never store database exports in the public repository.

## Incident Response Basics

1. Rotate compromised secrets (`AUTH_SECRET`, API keys)
2. Invalidate affected user sessions (`sessionVersion` increment or deactivation)
3. Revoke compromised dashboard shares
4. Review audit and integration logs
5. Redeploy a known-good Vercel deployment if application code is suspected
