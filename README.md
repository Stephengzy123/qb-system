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

The application is a standard Next.js App Router project intended for Vercel. External services will be configured with Vercel environment variables rather than committed credentials. `vercel.json` explicitly sets the cloud build to `npm run vercel-build`, which applies pending database migrations before building Next.js. The migration runner uses the cloud environment’s `DATABASE_URL`, skips already-applied migrations, and stops the deployment if a migration fails.

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

### Question-set uploads

Uploads support image selection, folders (including subfolders), and ZIP archives. The folder browser offers **New folder** and **Add set to folder** where the user has upload permission; active staff can create top-level folders. The upload screen uses folder IDs, shows navigable breadcrumbs, and can create child folders without losing selected images. View-only ancestors remain navigable, but cannot receive uploads or new children. Folder and set names are trimmed and duplicate sibling names are checked without case sensitivity; uploads never implicitly create a path. Click through existing folders to choose a destination, enter the set name separately, review naturally ordered image previews and warnings, then confirm the upload. Invalid files are skipped; valid images become draft questions with the selected choice count. Limits: 500 files, 4 MB per image, 100 MB ZIP input, 200 MB expanded ZIP contents.

Apply migration `011_question_uploads.sql` using the existing migration command before serving the updated application. The Vercel build command already runs migrations. Uploads require the existing database and R2 environment variables. The server uploads each image to the private bucket, reads it back, and compares its size and SHA-256 before saving it as successful. The displayed folder hierarchy is stored in PostgreSQL; R2 uses stable import/file IDs as object keys. No bucket CORS change is required because transfers go through authenticated server routes.

Successful images and per-file failures are saved in the question bank and import history. Retry failed files from the original upload tab; retries are idempotent for completed files. Closing the tab releases the local files, so unfinished uploads cannot currently resume from a new tab. If R2 succeeds but the database write fails, the deterministic object key allows a retry to reuse that staging object.

Verification: `npm run test:uploads` checks validation and simulated R2 read-back failures (Node 22.15+); `npm run test:uploads:ui` runs Chrome tests for folders, ZIPs, nested paths, review, and retry behavior using a local fixture with simulated API responses. These tests do not contact a live bucket. Live R2 verification was not run in this checkout because its environment is unconfigured.

### Folder browsing and answer keys

The question bank shows a folder tree, clickable path breadcrumbs, subfolders, and sets in the selected folder. Opening a set displays its question images and correct-choice controls. Staff with edit access can select or clear answers and save the answer key; viewers receive a read-only view. Answer keys are stored per set/question version with an audit entry, and stale edits are rejected rather than silently overwriting another editor's changes. Existing assignment grading keys remain independent.

Migration `012_question_set_answers.sql` is required for the folder browser's answer counts and set editor. The existing Vercel build migration step applies it on deployment. `npm run test:question-bank` covers answer validation, authorization, save/clear behavior, and conflicting edits using a simulated database; the browser suite now also covers folder paths and answer editing.

During upload and verification, a visible notice asks users to keep the page open. Refresh/close triggers the browser's leave warning, and same-tab link navigation asks before interrupting uploads. The final success or attention notice stays on the page, including skipped-file warnings. Returning to the upload page in the same tab provides a link to the latest saved upload and its server-recorded result. This does not make uploads run as background jobs.

### Assigning sets to classes

Create assignment loads real accessible question sets and active classes managed by the current staff member. Select one or more sets and classes, enter a title, optional instructions and due date, review the selections, and publish. The selected sets are combined into one assignment per class in selection order; duplicate question versions appear once. Empty sets are disabled, in-progress imports are flagged, and missing answer keys produce a warning. Conflicting keys for a shared question must be resolved first.

Migration `013_assignment_batches.sql` records all source sets and supports retrying an uncertain creation without duplicating assignments. Each batch is transactional: all selected classes succeed together. Assignment questions reference fixed versions and copy their current set answer keys. Published assignments appear in the staff list, class details, and enrolled students' workspace. Staff and students can open assigned question images; student image access checks the assignment and current active enrollment. Students can save MCQ responses, submit once, and review their graded results (see below).

`npm run test:assignments` tests selection validation, combining questions, permissions, snapshots, atomic failures and idempotent retries with a simulated database. The local browser suite includes multiple-set/multiple-class creation, accurate empty states, and network retry behavior. No live database or R2 tests are performed by these suites.


### Student work, results, and accounts

Students select one choice per question and confirm submission. Every answer selection or clearing immediately attempts to save a local draft, scoped to the student and assignment on that browser. Reloading restores the draft; if the cloud revision has changed, students explicitly choose between local and cloud answers. Browser storage failures show a warning to keep the page open until saving to cloud or submitting. **Save to cloud** backs up answers to the account, with a visible 30-second cooldown that survives reloads and is also enforced on the server before response writes. Submission remains available during the cooldown. Local drafts are removed after successful submission. Saved work is protected by a revision check; stale tabs receive an actionable error. Submission is transactional and repeat submissions do not change answers or add another submission event. Grading uses the assignment-owned answer key on the server. Unanswered keyed questions count as incorrect; unkeyed questions remain ungraded and are excluded from accuracy. Correct choices and correctness are shown to the student only after submission.

Assignment links in class details and the staff assignment list open a report with submission status, whole-class accuracy, per-question accuracy, and links to individual student results. Individual results include selected/correct choices and question images. Completed work appears at the bottom of the student's workspace, and students retain access to their own completed results when an assignment/class closes or enrollment ends. Students cannot view another student's work; teachers require an active teaching membership for class reports.

The admin-only Students tab supports account search, current/past assignment histories, overall and per-question results, disabling/restoring accounts, and linking disabled duplicate accounts to an active retained account. Linking does not merge or delete work. Disabling revokes database sessions and is enforced by the app-user check even when an authentication cookie is cached. Administrative actions are audited.

Migration `014_student_results.sql` adds duplicate-account links and reporting indexes. Migration `015_cloud_save_cooldown.sql` adds the timestamp used to enforce cloud-save cooldowns. The existing Vercel build migration step applies both. `npm run test:learning` covers grading, authorization, conflict handling, submission replay, and account management with simulated database responses. The browser suite covers saving/reloading/submitting answers, results navigation, completed history, admin navigation, and disable/restore with simulated APIs. Live database and R2 verification remain outside these local checks.

### Error practice and completed work

Students can start personal error practice from their workspace, choosing any integer from 5 to 50. Selection uses submitted incorrect answers (including previous practice), weighted by error count and recency, without repeated question versions in a session. Each error has baseline weight 1 plus a recency bonus of 3 that halves every 14 days. Questions answered correctly after their most recent mistake are placed in a review pool, normally about 20% of each session. A later incorrect answer returns a question to the main practice pool. Either pool fills any shortage in the other; if fewer questions are available overall, all available questions are used. Sessions snapshot their questions and grading keys, save through the existing work flow, and appear in Completed work after submission. Practice is excluded from class assignment lists and counts. Administrators and the student's active teachers can review practice through Students → student → Completed work; teachers' regular assignment history remains limited to their classes.

Staff can close an open assignment with no due date from its assignment page. Saves and submissions are blocked after closing; prior submissions remain readable. Admin appearance controls live only in Settings and are temporary, stored only in that browser. Solid/gradient background, angle, corner radius, sidebar background/text, primary, secondary, and accent colors apply across admin pages. Teacher and student workspaces keep their own default styles. Existing saved gradients are preserved; Reset appearance restores defaults.

Apply `database/016_error_practice.sql` through `npm run db:migrate` with `DATABASE_URL` configured before running this version. The deployment build already runs migrations. Run `npm run test:error-practice` for selection, creation, retries and closing tests; `npx playwright test` covers browser interactions and responsive layouts.
