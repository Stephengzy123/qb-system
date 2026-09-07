# Question Bank

First implementation draft of a private, image-first question bank and assignment system.

## Current draft

The current implementation includes:

- username/password sign-up and login
- separate staff and student workspaces
- real class creation with private, random class codes
- student join requests and class-scoped teacher/admin approval
- live dashboard counts
- empty states with no generated sample records
- service connection checks for Neon and Cloudflare R2
- responsive layouts for desktop and mobile

The initial PostgreSQL schema is in `database/001_initial_schema.sql`. It establishes the approved foundations for:

- immutable question content versions
- many-to-many question/set membership
- assignment-specific grading keys and safe regrading
- separate class-folder and class-set access
- persisted per-student assignment order
- optimistic autosave conflict protection
- permanent submission/reopen history
- imports, private assets, reconciliation, and audit logs

The application starts with honest empty states. It does not create sample classes, questions, students, or assignments.

## Local development

```bash
cd /Users/stephengzy/.codex/.chatgpt-projects/g-p-6a9dffd9532c8191b59b62f2322237cc/qb-system
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when connecting external services.

To link this checkout to the existing Vercel project and download its Development variables:

```bash
cd /Users/stephengzy/.codex/.chatgpt-projects/g-p-6a9dffd9532c8191b59b62f2322237cc/qb-system
npx vercel link
npx vercel env pull .env.local
npm run dev
```

Next.js automatically loads `.env.local` on the local server. These values remain server-only unless a variable name starts with `NEXT_PUBLIC_`; `.env.local` and the `.vercel` project link are ignored by Git.

## Deployment

The application is a standard Next.js App Router project intended for Vercel. External services will be configured with Vercel environment variables rather than committed credentials.

## Environment variables

Add these in **Vercel → Project Settings → Environment Variables**. Use the same names shown below. Secrets should be entered directly in Vercel and must never be committed to the repository.

The current visual draft runs without external services. The variables marked **Required for backend** become required as the corresponding database, authentication, upload, and cleanup services are connected.

| Variable | Required | Secret | What it represents |
| --- | --- | --- | --- |
| `DATABASE_URL` | Required for backend | Yes | PostgreSQL connection string. For the preferred Neon setup, use the pooled connection string supplied by Neon. It contains database credentials and must remain server-only. |
| `AUTH_SECRET` | Required for authentication | Yes | High-entropy secret used by the selected authentication/session provider to sign or encrypt session data. Generate a unique value for every customer deployment. Do not reuse it between environments. |
| `INITIAL_ADMIN_USERNAME` | Required for initial setup | Treat as private configuration | Username that receives an administrator profile after signing up. Other self-created accounts become students; their individual class join requests remain pending until an authorized teacher or administrator approves them. Matching is case-insensitive. |
| `BETTER_AUTH_URL` | Optional | No | Canonical deployed application origin, such as `https://questions.aoma.ca`. Vercel's production hostname is used automatically when this is omitted. Set it explicitly when using a custom domain. |
| `R2_ACCOUNT_ID` | Required for uploads | Treat as private configuration | Cloudflare account identifier that owns the R2 bucket. It is used to construct the account-specific R2 API endpoint. |
| `R2_ACCESS_KEY_ID` | Required for uploads | Yes | Access-key identifier for the server-side R2 API token. The token should be limited to the intended private bucket and required operations. |
| `R2_SECRET_ACCESS_KEY` | Required for uploads | Yes | Secret portion of the R2 API credential. It must only be available to server-side code. Never prefix it with `NEXT_PUBLIC_`. |
| `R2_BUCKET_NAME` | Required for uploads | Treat as private configuration | Name of the private R2 bucket containing original and derived question assets. Use a separate bucket or isolated configuration for each customer deployment. |
| `MAX_UPLOAD_BYTES` | Optional | No | Maximum accepted size of one uploaded file in bytes. Default: `15728640` (15 MiB). Requests over this limit should be rejected before processing. |
| `MAX_IMAGE_PIXELS` | Optional | No | Maximum decoded image area, calculated as width × height. Default: `40000000` (40 megapixels). This protects image processing from excessively large or malicious files. |
| `STAGING_RETENTION_HOURS` | Optional | No | Number of hours an abandoned staging upload may remain before automatic cleanup. Default: `24`. |
| `UNREFERENCED_ASSET_RETENTION_DAYS` | Optional | No | Grace period before permanently removing an asset that is no longer referenced by a valid question version or assignment. Default: `7`. |
| `ORIGINAL_UPLOAD_RETENTION_DAYS` | Optional | No | Number of days to retain private original uploads for recovery or reprocessing. Default: `30`. This can later be changed per customer policy. |

### Vercel environment scope

Configure credentials separately for Vercel's **Development**, **Preview**, and **Production** environments:

- Use separate development/preview and production databases where possible.
- Use separate R2 buckets or clearly isolated prefixes for non-production data.
- Generate a different `AUTH_SECRET` for production.
- Add retention and upload limits to all three environments so behavior remains predictable.

Vercel also supplies system variables such as `VERCEL`, `VERCEL_ENV`, and deployment URL values automatically. They do not need to be added manually, and the application should not treat them as credentials.

### Local environment

For local development, copy `.env.example` to `.env.local` and fill in only the services being tested. `.env.local` is ignored by Git.

```bash
cp .env.example .env.local
```

Do not put browser-visible configuration under a `NEXT_PUBLIC_` name unless it is intentionally safe for every user to read. Database and R2 credentials must always remain server-only.

## Architecture defaults

- Next.js + TypeScript
- PostgreSQL (Neon is the current preferred host)
- private Cloudflare R2 assets
- one customer organization per deployment
- server-side autosave as the source of truth
- 24-hour staging cleanup and seven-day unreferenced asset grace period
