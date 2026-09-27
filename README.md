# SwasthyaFlow

SwasthyaFlow is a staff-facing intake and review system for source-linked frontline health information. It combines authenticated intake, report OCR, structured extraction, deterministic safety rules, human review, and an append-only audit trail.

The repository has two explicit deployment profiles:

- **Local development:** PGlite, local private files, real Tesseract OCR for PNG/JPEG reports, deterministic local text extraction, and staff credentials provisioned by the seed command. No patient or encounter examples are seeded.
- **Production:** PostgreSQL with verified TLS, hospital OIDC, facility isolation, approved enterprise OCR/extraction/translation/speech providers, KMS-encrypted object storage, clinical rules approval, retention, and fail-closed readiness checks.

There is no synthetic OCR fallback. If an OCR provider is unavailable, processing stops with a visible error and staff may enter a verified transcription manually.

## Local development

Requires Node 20+ and pnpm.

```sh
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

Open http://localhost:3000. Local image OCR uses Tesseract.js and downloads the configured language model on first use. `OCR_LANGUAGES=eng` is the fastest baseline; add approved local language packs only after validating them. PDF OCR requires the enterprise OCR adapter because PDFs can contain multiple pages and embedded text/image combinations.

### Local bootstrap accounts

These credentials exist only in isolated local development. They are disabled in production, where the hospital identity provider owns account lifecycle and credential policy.

| Role | Username | Password |
|---|---|---|
| Health Worker | `health.worker` | `HealthWorker!2026` |
| Nurse | `nurse.meera` | `Nurse!2026` |
| Medical Officer | `doctor.ananya` | `Doctor!2026` |
| Medical Officer | `doctor.vikram` | `Doctor!2026` |
| Administrator | `administrator` | `Admin!2026` |

## Report integrity workflow

1. Validate the declared MIME type, file signature, decoded image/PDF structure, byte limit, pixel limit, dimensions, and PDF page count.
2. Store the original report privately with its SHA-256 digest and provenance metadata.
3. Auto-rotate, resize, grayscale, normalize, and sharpen images before OCR.
4. Preserve raw OCR, token confidence, bounding boxes, engine identity, quality warnings, and failure codes.
5. Require staff to compare the extraction with the original report and save corrected text separately.
6. Exclude unverified OCR values from deterministic safety rules.
7. Audit upload, OCR completion/failure, and staff verification without placing report contents in audit metadata.

## Production configuration

Copy `.env.example` into the deployment secret store and fill every production value. Set:

```env
DEPLOYMENT_MODE=production
AI_MODE=enterprise
OCR_MODE=enterprise
```

Production readiness additionally requires `OCR_API_URL`, `OCR_API_KEY`, and `OCR_DPA_APPROVED=true`, alongside the database, OIDC, storage, extraction, translation, speech, retention, and clinical rules controls listed in `.env.example`. `GET /api/health` returns 503 while any gate is incomplete.

The enterprise OCR endpoint receives multipart form data with `document`, `languages`, and `include_tokens=true`. It must return validated JSON containing `rawText` and per-token `text`, `confidence`, `bbox`, and `page`. Provider contracts, data residency, security review, and a data protection assessment remain deployment obligations.

Run migrations before traffic reaches a new release:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

Schedule `pnpm retention:run` and alert on failure. See [Clinical release gate](docs/CLINICAL_RELEASE.md) for validation, regulatory, security, and operational evidence required before patient use.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Automated checks verify software behavior. They do not establish clinical performance, regulatory clearance, or authorization to process patient data.
