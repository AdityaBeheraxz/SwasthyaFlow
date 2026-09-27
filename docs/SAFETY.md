# Safety mapping

| PRD rule | Enforcement | Verification |
|---|---|---|
| §57–58 priority precedence and no silent downgrade | `lib/safety/resolve.ts`, `app/api/triage/analyze/route.ts` | `tests/safety.test.ts` |
| §59 RED override and audit | `app/api/reviews/override/route.ts` | `tests/safety.test.ts` (policy) |
| §60 empty note failure | `lib/safety/resolve.ts`, analyze route | `tests/safety.test.ts` |
| §61 uncertainty | `components/uncertain-speech.tsx`, `components/report-source.tsx`; original files, raw OCR, reviewed text, token confidence, and provenance preserved | Browser integration and unit tests |
| §62 performance | `components/performance-panel.tsx` shows measured intake, OCR, triage durations | Browser inspection |
| §63 explicit failure states | Analyze route and development failure panel | Manual inspection; test coverage incomplete |
| §64 server authorization and Zod | API route handlers | Typecheck and manual review |
| §65 rules-first pipeline | `lib/pipeline.ts`, `lib/safety/rules.ts` | `tests/safety.test.ts` |
| §66–67 acceptance | Modular adapters under `lib/{speech,ocr,translation,ai}` and reviewer workflow | `tests/e2e/journey.spec.ts`; enterprise providers require deployment validation |
