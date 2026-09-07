# Question Bank

First implementation draft of a private, image-first question bank and assignment system.

## Current draft

The current interface covers the teacher/admin workspace:

- operational overview
- question-set browsing and filtering
- class overview and enrollment indicators
- assignment overview
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

The visible data is representative seed data for the first product draft. Authentication, live database reads, R2 uploads, and grading services are the next implementation slice.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when connecting external services.

## Deployment

The application is a standard Next.js App Router project intended for Vercel. External services will be configured with Vercel environment variables rather than committed credentials.

## Architecture defaults

- Next.js + TypeScript
- PostgreSQL (Neon is the current preferred host)
- private Cloudflare R2 assets
- one customer organization per deployment
- server-side autosave as the source of truth
- 24-hour staging cleanup and seven-day unreferenced asset grace period
