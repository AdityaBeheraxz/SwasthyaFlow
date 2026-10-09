# Engineering acceptance review

Last verified: 2026-10-08. This record describes engineering checks performed against the repository. It is not clinical validation, regulatory clearance, or authorization to process patient data.

| Area | Result | Evidence and limits |
|---|---|---|
| Report upload validation | Pass | Server checks type signatures, decoded image format, PDF structure, size, resolution, page count, entropy, sharpness, and SHA-256 provenance. |
| OCR processing | Pass locally | Tesseract processes PNG/JPEG and Poppler-rendered PDF pages. An integration test verifies two-page OCR and page coordinates. Production requires enterprise OCR. |
| Human verification boundary | Pass | Raw OCR remains immutable; reviewed text, reviewer, time, and hashes are stored separately. Unverified OCR values cannot affect priority. |
| Verified report rules | Pass | A browser integration test confirms a reviewed haemoglobin value triggers the approved deterministic rule. |
| Priority precedence | Pass | Unit tests cover RED precedence, rerun protection, rules failure, and override authorization. |
| Authorization and isolation | Pass in automated tests | Intake, queue, review, audit, and administration routes enforce roles and facility scope. Production requires OIDC. |
| Audit trail | Pass | Upload, OCR, verification, state, review, override, and referral actions create append-only events without storing report text in audit metadata. |
| Failure behavior | Pass | OCR/provider failures are visible and stop processing. There is no fabricated OCR fallback. |
| Accessibility | Pass for checked routes | Automated axe checks report no serious or critical violations on the primary routes. Manual assistive-technology review remains required. |
| Production configuration | Pass as a gate | Startup/readiness reject local persistence, local storage, development authentication, unapproved providers, weak secrets, incomplete TLS, and missing retention configuration. |

## Required external evidence

Before clinical use, complete the regulatory assessment, clinical safety case, local population and language validation, provider contracts, DPIA, penetration test, operational readiness, and accountable release approval in [CLINICAL_RELEASE.md](CLINICAL_RELEASE.md).

## Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Recorded on 2026-10-08: type checking passed, lint passed, 68 unit/provider/safety/privacy tests passed and 20 browser journeys passed across the regression run and targeted rerun. Browser records were isolated in a separate test database. Checks cover private response headers, minimized queues, administrator clinical-read denial, blocked referral export, guardian consent, consent withdrawal, revoked-session replay, unapproved external transport, treatment-language rejection and source-grounding checks. Earlier local ASR and multi-document verification remain covered.

The optimized Next.js build also completed successfully on 2026-10-08.

Existing checks include exact Hindi/Odia fixture registration, invalid mode and production fixture rejection, IndicTrans2 request/response contracts, malformed live responses, denied Indic symptoms, lab conflicts, duration units, source evidence, report review resets, idempotent sync/conflict handling, encrypted drafts, interrupted sync, offline document upload and real network loss. No live provider accuracy testing or India-specific clinical training was performed. See [INDIA_PRIVACY_SAFETY.md](INDIA_PRIVACY_SAFETY.md) and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for the remaining boundaries.

## Referral MVP verification (8 October 2026)
Type checking and lint passed; 71 unit tests passed. Six targeted browser journeys passed: the existing review/complete journey, screen accessibility, clinical privacy and session/guardian checks, directory/referral/PDF/withdrawal flow, and child referral/multilingual PDF/audit checks. Test recipients were inserted only into the isolated .data/e2e database; the application directory remains empty. The report template was visually inspected for Hindi and Odia rendering. No real hospital delivery was attempted.

## Pending-sync recovery (8 October 2026)
Type checking and targeted lint passed. Three browser regression checks passed: document sync updates the intake screen without claiming unverified sources are ready; retries recover a lost server confirmation without duplicate patient or encounter creation; encrypted drafts survive reload and sync directly from the queue, which refreshes after confirmation. Drafts remain encrypted and are retained on failed sync.

## Tesseract upload workflow (8 October 2026)
Camera capture and camera document-type controls removed. Local OCR now uses provisioned traineddata files without runtime model downloads. English, Hindi and Odia models are installed for this preview. Type checking and targeted lint passed; three real OCR browser checks passed: independent prescription/report extraction and verification, printed Hindi recognition, and printed Odia recognition. These are engineering checks on clear synthetic documents, not proof of handwriting accuracy or clinical validation. See TESSERACT_OCR.md.
