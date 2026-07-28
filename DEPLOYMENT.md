# Deployment Guide — DamnArt CRM on Vercel

DamnArt CRM deploys as **one Next.js project** on Vercel with **MongoDB Atlas**.

Local verification (already expected to pass before deploy):

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

---

## Quick start (production)

### 1. MongoDB Atlas

1. Create a cluster and database (e.g. `damnart_crm`).
2. Create a database user with `readWrite` on that database.
3. Network access: allow Vercel by setting **Allow access from anywhere** (`0.0.0.0/0`) on Atlas free/shared tiers, or use the Atlas–Vercel integration if available.
4. Copy the SRV connection string.

### 2. Create indexes and administrator (once)

From your machine (with production `MONGODB_URI` in `.env`):

```bash
# Generate a strong Auth.js secret (save it for Vercel)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

npm run db:indexes
npm run seed
```

Use a **strong** `SEED_ADMIN_PASSWORD` (not the example value). Seed refuses known weak passwords when `NODE_ENV=production`.

Do **not** set `ALLOW_DEMO_SEED=true` in production.

### 3. Import into Vercel

1. Push this repository to GitHub/GitLab/Bitbucket.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. **Root Directory:** leave default (this repo *is* the Next.js app).
4. Framework: **Next.js** (auto-detected).
5. Add environment variables (Production + Preview as needed):

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | `damnart_crm` (or your DB name) |
| `AUTH_SECRET` | ≥ 32 character secret from step 2 |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://your-domain.vercel.app` (update after first deploy / custom domain) |
| `APP_URL` | Same as `AUTH_URL` |

Optional: `LOGIN_MAX_ATTEMPTS`, `LOGIN_BLOCK_MINUTES`, `WEBHOOK_RATE_LIMIT_PER_MINUTE`, `WEBHOOK_RATE_LIMIT_PER_HOUR`.

**Do not** add `SEED_*` or `ALLOW_DEMO_SEED` to Vercel unless you intentionally re-seed from a secure local machine.

6. Deploy.

### 4. After first deploy

1. Set `AUTH_URL` and `APP_URL` to the real production URL (including custom domain if used).
2. Redeploy so Auth.js and absolute links use the correct host.
3. Open `https://your-domain/api/health` → expect `"status":"ok"` and `"database":"connected"`.
4. Sign in as the seeded administrator.
5. Smoke test:

```bash
SMOKE_TEST_URL=https://your-domain npm run smoke-test
```

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | Atlas URI |
| `MONGODB_DB` | Yes | Database name |
| `AUTH_SECRET` | Yes | ≥ 32 chars |
| `AUTH_URL` | Yes (prod) | Public site URL |
| `AUTH_TRUST_HOST` | Yes on Vercel | `true` |
| `APP_URL` | Recommended | Canonical URL for links |
| `LOGIN_MAX_ATTEMPTS` | No | Default `5` |
| `LOGIN_BLOCK_MINUTES` | No | Default `15` |
| `WEBHOOK_RATE_LIMIT_PER_MINUTE` | No | Default `60` |
| `WEBHOOK_RATE_LIMIT_PER_HOUR` | No | Default `300` |

Never use `NEXT_PUBLIC_` for secrets.

---

## Production checklist

```text
[ ] MongoDB Atlas database created
[ ] DB user least privilege (readWrite on CRM DB)
[ ] Network access configured for Vercel
[ ] Strong AUTH_SECRET set in Vercel
[ ] AUTH_URL + APP_URL match the live domain
[ ] AUTH_TRUST_HOST=true
[ ] Indexes created (npm run db:indexes)
[ ] Administrator seeded with strong password
[ ] ALLOW_DEMO_SEED not enabled in production
[ ] /api/health returns ok + connected
[ ] Login works
[ ] Create test website + form
[ ] Webhook accepts valid API key
[ ] Invalid API key rejected
[ ] Invitation flow works
[ ] Shared dashboard works / revoke works
[ ] CSV export works
[ ] Production build passed in Vercel
[ ] Security headers present (HSTS in production)
```

---

## Rollback

1. In Vercel → Deployments → promote a previous successful deployment.
2. Restore MongoDB only if a migration corrupted data (Atlas backup / prior export).
3. Avoid destructive migrations without a verified backup.

---

## Backup

- Enable Atlas backups on a tier that supports your retention needs.
- Export critical collections before major schema changes.
- Never commit database dumps to Git.

---

## Architecture constraints (keep these)

- Single Next.js app · single Vercel project · MongoDB Atlas
- No Redis, queues, workers, or separate backends
- Node.js runtime for MongoDB routes (already configured)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `/api/health` shows `database: disconnected` | Atlas **Network Access** blocks Vercel, or `MONGODB_URI` / `MONGODB_DB` missing/wrong in Vercel |
| Login always says invalid email/password | Usually the DB is disconnected (same as above). After DB is fixed, wrong password or admin never seeded |
| Admin password from `.env` does not work | Seed does **not** overwrite existing admins unless `RESET_ADMIN_PASSWORD=true` |
| Build fails on missing env | Add required vars in Vercel → Settings → Environment Variables, then redeploy |
| Login redirect loops | `AUTH_URL` / `APP_URL` must be `https://crmdamnart.vercel.app` (or your custom domain) |
| Cookies fail on HTTPS | Ensure production deploy; `AUTH_TRUST_HOST=true` |
| Webhooks 401 | API key not regenerated / wrong `x-api-key` header |

### Fix database disconnected (most common production login failure)

1. Open [MongoDB Atlas](https://cloud.mongodb.com) → **Network Access**.
2. Add IP address **`0.0.0.0/0`** (Allow access from anywhere) — required for Vercel serverless IPs.
3. Confirm Vercel env vars include the same `MONGODB_URI` and `MONGODB_DB` used locally.
4. Redeploy on Vercel (or wait ~1 minute after Atlas IP change).
5. Check `https://your-domain/api/health` until `"database":"connected"`.

### Reset administrator password

Locally (against the same Atlas DB Vercel uses):

```bash
# In .env set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD to the desired login
RESET_ADMIN_PASSWORD=true npm run seed
```

Then sign in on production with that email/password.

Health check (no auth):

```text
GET /api/health
```
