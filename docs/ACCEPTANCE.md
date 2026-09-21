# Acceptance review

This is an educational prototype using synthetic data. Verification below reflects the local mock run on 2026-09-20, not clinical validation.

## Production hardening update — 2026-09-21

The application now has a fail-closed production candidate profile with PostgreSQL-only persistence, OIDC, facility isolation, KMS-backed object storage, file signature checks, shared rate limits, approved enterprise extraction, provider data-control gates, two-person clinical rules approval, ruleset checksums, readiness checks, and automated retention. The local build, 20 unit/safety checks, and all five browser journeys pass. Formal clinical validation, regulatory assessment or clearance, provider contracts, hospital privacy approval, penetration testing, infrastructure operations, and accountable release signoff remain external requirements; see [Clinical release gate](CLINICAL_RELEASE.md).

| Requested check | Result | Evidence or remaining gap |
|---|---|---|
| Full mock journey | Partial | Playwright covers consent, English text, synthetic CBC, triage, reviewer edit, approval, referral, completion, and audit. A Hindi/Odia voice journey was not run end to end. |
| Four replaceable AI/ML modules | Partial | Speech, OCR, translation, and extraction have mock/live adapters. Live integrations were not run with provider credentials or installed OCR language data. |
| Required safety unit tests | Pass | `pnpm test`: 17 tests passed, including all named safety cases. API integration coverage is narrower than the requested full API suite. |
| Priority precedence and no rerun downgrade | Pass | Pure safety tests and server-side resolver. |
| Empty triage failure and recovery | Partial | `TRIAGE_FAILED` and review/failure paths exist; every simulated failure was not exercised in the browser. |
| RED queue and override audit | Pass | Server queue ordering and override policy tests; Playwright verifies reason rejection and `RISK_OVERRIDE`. |
| Uncertain OCR/ASR source links | Partial | “Possibly” and source actions render; exact image bounding-box highlighting is incomplete. |
| Non-diagnostic output | Partial | Guard is tested and applied to AI output, reviewer edits, and referrals. No exhaustive content audit of all possible provider output was performed. |
| Every AI field editable and audited | Partial | Summary editing and audit work; other generated fields are read-only. |
| Consent, anonymity, synthetic data, disclaimers | Pass in local mock flow | Consent is enforced by the API before analysis; seeded records use anonymous IDs. This is not a production privacy assessment. |
| Offline PENDING SYNC | Pass | Playwright verifies queued text intake remains pending until server confirmation. Audio and image offline sync are not implemented. |
| Hindi/Odia typography | Partial | Fonts and language attributes are configured; full visual checks across every view were not run. |
| Landing 3D robustness and performance | Partial | Scene is lazy and poster-first, with reduced-motion and low-power fallback. FPS, compressed chunk budget, and Lighthouse LCP were not measured. |
| UI banned-list, axe, keyboard | Partial | Visual review and axe on six key pages found no serious or critical issues. Full keyboard-only run and all screen states were not checked. |
| README local run | Partial | Commands and configuration are documented; a clean-machine setup was not tested. |

## Verification commands

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` passed on the local machine. The full Playwright suite passed 5/5 tests. The extended completion journey passed again after the final change.

## Engineering deviations

The requested `shadcn/ui`, React Hook Form, and Motion packages are not used in the rendered workflow; controls are custom React components. Migrations use checked-in SQL, though `drizzle-kit generate` could not run in this Windows environment. The requested per-phase commits were not recorded during the build; this handoff contains one consolidated commit. Provider integrations, local file storage, and demo authentication require further engineering before deployment or clinical use.
