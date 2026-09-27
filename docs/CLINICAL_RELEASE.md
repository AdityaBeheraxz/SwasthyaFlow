# Clinical release gate

SwasthyaFlow has a hardened production deployment profile. That profile is intentionally fail closed. A green build is an engineering result; it does not establish clinical safety, regulatory clearance, or permission to process patient data.

## Required evidence before clinical use

- Fix the manufacturer and intended-use statement, including whether the product is SaMD or SiMD under India’s Medical Devices Rules.
- Have qualified regulatory counsel assess and complete applicable CDSCO classification, registration, and licence obligations.
- Have the accountable Medical Officer approve a clinical safety case covering the population, languages, setting, exclusions, foreseeable misuse, mitigations, and residual risk.
- Validate the exact ruleset on representative local data. Record sensitivity, specificity, under-triage, over-triage, subgroup results, confidence intervals, acceptance thresholds, and sample provenance.
- Validate Hindi and Odia speech, translation, OCR, and extraction end to end using appropriately governed data.
- Test human factors, accessibility, downtime, escalation, and emergency workflows with intended users.
- Obtain hospital approval for the DPIA, retention schedule, consent text, privacy notice, data processors, cross-border transfers, incident plan, and grievance process.
- Approve contracts and data controls for every provider. The public Gemini Developer API is excluded from the clinical production path.
- Operate PostgreSQL backups, point-in-time recovery, object versioning, KMS key rotation, restore drills, monitoring, alerting, vulnerability management, and disaster recovery through named owners.
- Complete an independent penetration test and dependency review with no unaccepted critical or high findings.
- Require regression and clinical revalidation for model, provider, or rules changes.

## Production controls in code

- Production refuses PGlite, development authentication, local object storage, local OCR/extraction, incomplete TLS, weak secrets, unapproved provider flags, and missing retention configuration.
- OIDC Authorization Code with PKCE, state, nonce, signed sessions, role mapping, and facility assignment replaces the role switcher.
- Patient, encounter, queue, source file, audit, and ruleset access are facility scoped.
- Uploads enforce size, declared type, file signatures, decoded image or PDF structure, dimensions, page count, authenticated access, and private no-store responses.
- OCR preserves the source file and raw extraction. Report values cannot enter safety rules until authorized staff confirm reviewed text against the source.
- Object storage uses KMS encryption. Failed database writes remove newly uploaded objects.
- Shared PostgreSQL rate limits, external-call timeouts, and visible failures prevent silent degradation.
- AI extracts source facts only. Deterministic rules choose priority.
- Production rules remain drafts until a different, designated Medical Officer approves them. Every triage run verifies the stored SHA-256 checksum.
- RED downgrade requires a Medical Officer’s written reason and creates an append-only audit event.
- Mutating requests require the configured same origin. Security headers and CSP are applied.
- Readiness returns 503 until configuration, database access, and the designated active ruleset pass.
- `pnpm retention:run` removes expired data and exits nonzero on failures.

## Deployment sequence

1. Create PostgreSQL with verified TLS and a least-privilege application role.
2. Create a private S3-compatible bucket with public access blocked and a dedicated KMS key.
3. Configure the production variables in `.env.example` through a secrets manager.
4. Run `pnpm install --frozen-lockfile`, `pnpm db:migrate`, `pnpm build`, and the automated tests.
5. Provision the facility and OIDC users. `CLINICAL_RULESET_APPROVER` must identify a Medical Officer.
6. Have an administrator submit the validated ruleset and the designated Medical Officer approve it.
7. Keep the application out of rotation until `GET /api/health` returns 200.
8. Run retention on a protected scheduler and alert on every nonzero exit.
9. Record formal release approval with version, commit, configuration baseline, rules checksum, date, and accountable signatories.

## Rollback and incident response

- Remove the service from rotation when readiness fails, a safety event is suspected, audit integrity is questioned, or provider conditions change.
- Preserve evidence, revoke affected sessions and credentials, rotate keys, and follow the hospital and CERT-In incident process.
- Roll back through approved change control. Reactivate a prior ruleset only when its checksum and clinical approval remain valid.
- Reconcile object storage against database references after interrupted purge or upload operations.
