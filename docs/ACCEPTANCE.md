# Engineering acceptance review

Last verified: 2026-09-27. This record describes engineering checks performed against the repository. It is not clinical validation, regulatory clearance, or authorization to process patient data.

| Area | Result | Evidence and limits |
|---|---|---|
| Report upload validation | Pass | Server checks type signatures, decoded image format, PDF structure, size, resolution, page count, entropy, sharpness, and SHA-256 provenance. |
| OCR processing | Pass locally | Tesseract processes real PNG/JPEG bytes. The enterprise adapter is required in the production profile. PDFs require the enterprise adapter. |
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

Recorded on 2026-09-27: type checking passed, lint passed, 23 unit and safety tests passed, all 9 browser journeys passed, and the optimized Next.js production build completed successfully.
