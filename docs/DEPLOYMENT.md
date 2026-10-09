# GitHub, Vercel and Supabase — hackathon deployment

This profile is for **test-only data**. It does not certify clinical readiness or institutional hospital onboarding. Local Hindi/English speech recognition still runs on the development PC; Vercel cannot run that Python worker. Hosted speech remains unavailable until a separate approved endpoint is configured. No substitute transcript is generated.

## 1. Supabase setup

Project: https://whigbynlzznmnsltdwsf.supabase.co

Use a separate empty hackathon database. Confirm its region in the Supabase dashboard; the URL does not establish its region. Prefer an Indian region when creating the project. The Vercel configuration selects Mumbai (`bom1`); this setting alone does not establish storage residency.

Copy connection strings from **Connect**. Use the transaction pooler for `DATABASE_URL` and a direct connection or session pooler for `DATABASE_MIGRATION_URL`. Set `DATABASE_POOL_MAX=1` and `DATABASE_SSL_MODE=verify-full`. If your connection requires a Supabase root certificate, set `DATABASE_CA_CERT` to its PEM contents (literal `\n` separators are supported). Never disable certificate validation to fix a connection. [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres), [node-postgres TLS configuration](https://node-postgres.com/features/ssl).

Create a **private** storage bucket named `swasthyaflow-private`. Configure the project's **server-side service role key** as `SUPABASE_SERVICE_ROLE_KEY`. Keep this key and the database password out of GitHub, browser code and `NEXT_PUBLIC_*` variables. The storage adapter rejects public buckets and serves originals through authenticated application routes. Service keys bypass storage RLS and must stay on the server. [Supabase storage access control](https://supabase.com/docs/guides/storage/security/access-control).

The app uses its existing staff credentials and sessions; it does not use Supabase browser authentication. Migration `0010_private_api` enables RLS on all application tables and revokes direct access from Supabase's `anon` and `authenticated` roles. Backend database credentials must use a table owner or appropriately privileged server role. Facility checks, consent checks, role checks and audit logging still run in the application.

## 2. Local provisioning

Use Node 22.13 or later in the Node 22 series, and the pnpm version recorded in `package.json`.

An ignored `.env.deploy.local` has been prepared locally with the project URL and unique generated signing/password secrets. Fill its empty database, storage-key and app-URL entries. This file is separate from the existing `.env.local` preview configuration. `.env.vercel.example` lists names only.

Run these once against the new test database, from the repository directory:

```powershell
node --env-file=.env.deploy.local node_modules/tsx/dist/cli.mjs db/migrate.ts
node --env-file=.env.deploy.local node_modules/tsx/dist/cli.mjs db/seed.ts
node --env-file=.env.deploy.local node_modules/tsx/dist/cli.mjs db/referral-pitch.ts
```

Stop if any command fails. Confirm you are targeting the empty hackathon project before provisioning: rerunning seed resets these staff account passwords. Do not run these commands during a Vercel build.

| Account | Password configuration |
| --- | --- |
| `health.worker` | `DEMO_HEALTH_WORKER_PASSWORD` |
| `nurse.meera` | `DEMO_NURSE_PASSWORD` |
| `doctor.ananya`, `doctor.vikram` | `DEMO_DOCTOR_PASSWORD` |
| `administrator` | `DEMO_ADMIN_PASSWORD` |
| `receiver.scb`, `receiver.mkcg`, `receiver.vimsar` | `REFERRAL_PITCH_PASSWORD` |

Hosted passwords must be unique secrets of at least 16 characters. The README's local example passwords are rejected in this profile. Odisha college names remain labelled prototype workspaces; no referral is delivered to an actual institution through these pitch accounts.

## 3. GitHub and Vercel

Publish the project source to **AdityaBeheraxz/SwasthyaFlow**, public. Exclude `.env*` secret files, `.data`, credentials, uploaded documents, local databases, build caches and patient information. Only the two blank environment examples are tracked. GitHub Actions checks lint, types, unit tests and the build.

In Vercel, choose **Add New → Project**, import this repository, choose **Next.js**, set the Node version to **22.x**, and keep the repository root as the project root. `vercel.json` sets the install/build commands and Mumbai region. [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github).

Add the following to the **Production environment**, including the secrets from `.env.deploy.local`:

| Variable | Value or source |
| --- | --- |
| `DEPLOYMENT_MODE` | `demo` |
| `DEMO_TEST_DATA_ONLY` | `true` |
| `APP_URL` | Exact HTTPS Vercel production origin, no trailing slash |
| `AUTH_SECRET` | Generated private secret from the deployment file |
| `DATABASE_URL` | Supabase transaction pooler string, including password |
| `DATABASE_SSL_MODE` | `verify-full` |
| `DATABASE_CA_CERT` | Root certificate if required by the connection |
| `DATABASE_POOL_MAX` | `1` |
| `STORAGE_MODE` | `supabase` |
| `SUPABASE_URL` | `https://whigbynlzznmnsltdwsf.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service role key |
| `SUPABASE_STORAGE_BUCKET` | `swasthyaflow-private` |
| `AI_MODE`, `EXTRACTION_MODE`, `TRANSLATION_MODE` | `local` |
| `ASR_MODE` | `unavailable` |
| `OCR_MODE` | `tesseract` |
| `OCR_LANGUAGES` | `eng+hin+ori` |
| `REFERRAL_DELIVERY_MODE` | `local` (labelled pitch inboxes inside this software) |

Provisioning passwords and `DATABASE_MIGRATION_URL` are needed locally for the provisioning commands; the running Vercel app does not need them. Do not expose deployment secrets to untrusted pull requests. Keep preview deployments on a separate test database and configure each preview's own `APP_URL`, or leave cloud access disabled for previews.

The build fetches three public Tesseract models from pinned upstream URLs and verifies their SHA-256 hashes. Documents are processed inside the function, never sent to that model download host. PDF pages use a bundled renderer; referral covers use bundled Noto fonts, preserving Hindi and Odia. Tesseract output still requires source verification, particularly handwriting.

Hosted report/audio uploads are limited to **3.5 MB per file** to leave room below Vercel's 4.5 MB request limit. Larger printable referral bundles use a streamed response. OCR and PDF download functions request a 300-second duration; verify your plan's current limits. [Vercel function limits](https://vercel.com/docs/functions/limitations).

After setting the variables, redeploy. `/api/health` must return `ok: true`. It checks required configuration and a real database query; an HTTP 503 indicates that configuration or connectivity is incomplete. A successful health response does not certify clinical validation or verify all provider operations.

## 4. Deployment verification

With fictitious test information only:

1. Sign in as a health worker; record consent and create an intake.
2. Upload one prescription and one report. Run OCR and verify each against its original.
3. Open the reviewer queue, authorize the source-facility doctor and record a review.
4. Create a referral, record separate sharing consent, and send it to a labelled pitch facility.
5. Open the receiving workspace with that facility's credentials. Verify originals, accept the referral and download/print the full PDF.
6. Confirm source review and referral actions appear in the audit view. Confirm another receiving facility cannot open the referral.
7. Withdraw consent; confirm receiving documents and downloads become inaccessible.
8. Refresh the deployment and verify saved records and originals survive. Sign out and confirm protected routes require authorization.

Schedule retention only after choosing the test-data lifetime and configuring an authenticated worker. There is no implied background scheduler on Vercel for the existing local CLI workers. Clear test data after the hackathon. Clinical deployment remains blocked behind the existing identity, approved providers, privacy, storage and clinical ruleset gates.

## Configured hackathon project

The existing project `whigbynlzznmnsltdwsf` was verified in `ap-southeast-1` (Singapore). Vercel functions use Mumbai. This is a test-data deployment; it does not establish Indian data residency.

The cloud database has 16 application tables, eight test staff logins, four labelled facility workspaces, nine referral routes, and baseline rulesets. The original local database is separate. Private uploads use `swasthyaflow-private` with no public access.

The runtime connection uses `swasthyaflow_app`, which has no schema creation privileges and cannot update or delete audit entries. It has explicit server-only policies on application tables; facility, staff role and consent authorization remain enforced in the application's server routes. Browser `anon` and `authenticated` roles have no table grants. The separate `swasthyaflow_migrator` owns the application tables and the pre-created `drizzle` schema. It has no database-wide CREATE grant. The PostgreSQL migration runner checks the existing schema, locks and validates migration history, and applies pending changes transactionally.

The Supabase-only role bootstrap is versioned under `db/supabase/`. Apply it only after the application migrations, using a project administrator. Login passwords are configured separately; never put passwords or password verifiers in migration files. New tables need explicit runtime grants and server-only RLS policies in their migration. The official Supabase root CA is configured locally and in Vercel; certificate and hostname verification stay enabled.

Deployment secrets remain in ignored `.env.deploy.local` and Vercel's encrypted environment settings. Test website sign-in details are saved in ignored `.data/hosted-access.txt`; that file contains website passwords, not infrastructure keys. Never commit or publish it.
