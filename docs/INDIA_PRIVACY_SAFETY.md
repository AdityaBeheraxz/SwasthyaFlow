# India confidentiality and non-treatment controls

8 October 2026 · Policy `2.1-IN-2026-10-08`.

## Enforced in the application

- Clinical case and source reads require an authenticated Health Worker, Nurse or Medical Officer in the case's facility and active processing consent. Administrators receive governance access without clinical case content. Authorized case access writes a text-free audit event; audit failure denies access.
- Queues omit patient names, intake narratives and other unused patient columns. Small analytics groups below five records are suppressed. Administrative audit metadata excludes free-text clinical reasons; the officer's original override reason remains in the protected audit trail.
- Public/bulk export remains disabled. Medical Officers can create a recipient-specific referral after case approval and separate consent, and download its PDF. The facility administrator verifies directory entries; no receiving system is connected and every report is NOT_SENT. Withdrawn consent or an inactive recipient blocks subsequent downloads. Existing downloaded copies cannot be recalled; facility handover and deletion procedures are required. The case interface has no general Print action. Print styles hide staff records. Original sources remain accessible to authorized staff for verification; these controls cannot prevent their copying or a screen photograph by an authorized person.
- API responses and protected pages use `private, no-store` and no-index headers. Errors do not log exceptions or echo validation details containing submitted values.
- Individual signed sessions require a unique configured secret, expire after 30 minutes, check current role/facility/account status, and are revoked on sign-out. Sign-out clears browser storage including pending drafts. Staff must sync necessary drafts before signing out.
- Guardian consent is required for intake below age 18. Consent purpose and policy version are audited. Recording verified consent withdrawal prevents subsequent case/source reads, queue listing and processing. Legal retention and erasure requests remain facility privacy operations.
- External ASR, translation, OCR and extraction require explicit approval, no-training/no-retention contractual confirmation, India processing-region confirmation and an exact HTTPS origin allowlist. Redirects are blocked. Flags are release assertions, not evidence that a vendor satisfies a contract; infrastructure/network controls must independently verify them.
- Production additionally requires database and object-storage India region declarations, an India S3 region, an accountable legal entity, a privacy contact and India validation approval. TLS, KMS, OIDC, retention and existing provider approval gates remain required. Local PGlite/object files are development storage; do not use them for real clinical records without independently approved encryption and deployment controls.

## No treatment suggestions

Server guards reject tested English/Hindi/Odia/Hinglish diagnosis or treatment instructions in generated facts and reviewer notes. Generated medication/history entries must be supported by source text. Unsupported symptom/duration claims fail closed. Report text comes from linked evidence, timelines come from the source, and follow-up questions come from a fixed factual question bank. The rules engine supplies staff review priority, not a disease or treatment.

Prescription names, strengths and schedules are source transcription only. Unknowns remain unknown and every original is verified by staff. Existing source text may describe prior treatment; displaying that source is not a new recommendation. Pattern guards cannot prove safety for every possible language or phrasing; a clinical release requires adversarial review and held-out language evaluation.

## India-specific validation, without patient-case training

There is no case-training, telemetry dataset or fine-tuning pipeline. User case data must not be exported for training, research, marketing, demonstrations or analytics outside the authorized deployment. No approved training dataset has been supplied; no claim of India-trained or clinically validated AI is made.

Text support covers English, Hindi and Odia originals, with limited controlled terms and Hinglish negation handling. The installed local Whisper model supports English and Hindi; Odia transcription is unavailable. Keyword translation is not a deployed IndicTrans2 model.

Before release, accountable reviewers must provide a versioned validation report covering:

1. Separate consented evaluation material or lawfully licensed non-case material; no reuse of product case records for training.
2. Indian accents and dialects, Hindi/Odia scripts, code-switching, background noise and original-language review.
3. Common Indian document layouts, handwritten prescriptions, ambiguous medication names/strengths, lab units and explicit negation.
4. Independent held-out evaluation for ASR errors, OCR/value errors, source grounding, inappropriate advice, false priority signals and uncertainty handling.
5. Coverage across relevant regions, ages and care settings, agreed acceptance criteria, accountable clinician approval, and documented unsupported groups/languages.
6. A threat model, penetration test, access-audit review, processor contracts, verified residency/encryption and an incident/rights-response process.

## Indian policy references and limits

Use the [MeitY DPDP framework](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit), its [commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf), and [ABDM Health Data Management Policy](https://abdm.gov.in/static/media/health_management_policy_bac9429a79.80f74bc3e039c00acd4f.pdf) in the deployment's legal/privacy assessment. DPDP commencement is phased; do not describe every obligation as already in force or the application as legally certified. ABDM applicability and integration require a separate assessment. Patient notices and translations require review by local language and privacy leads.
