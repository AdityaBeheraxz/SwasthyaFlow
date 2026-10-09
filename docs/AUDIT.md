# Audit workspace

Open `/audit` for the facility trail. Open a case reference in the table for its scoped trail, current priority and review/referral link. Approved cases link to the Referrals workspace; cases needing review link to their source case.

## Controls

- Search by action code, displayed action label, staff name, staff ID or encounter ID. Patient names and clinical narratives are not search fields.
- Date bounds include the entire selected day in Asia/Kolkata. Reversed bounds produce a visible validation message.
- Apply changes the server query; Reset clears filters. Switching between facility and case views resets filters.
- Refresh reloads events and current case status. Applying filters or finding no matching events keeps the authorized case summary available.
- Older events use a timestamp and ID cursor. A failed pagination request retains existing rows and can be retried.
- Hiding routine access events changes the view only. It does not delete audit records.

## Access and privacy

Facility queries are scoped to the signed-in facility and return redacted metadata. Case queries use the effective source reviewer, require active patient consent for clinical roles, and return detailed metadata only to a Medical Officer. Administrator case queries retain redacted governance history without clinical context. Receiving workspace credentials do not authorize another facility's source-case audit.

Session expiry or loss of case access clears loaded case records and priority. Case context comes from the same authorized server read used by the audit endpoint; no separate full clinical-record download is needed. Viewing a case trail records access. Audit database triggers preserve append-only history.

## Verification

`tests/e2e/audit-workspace.spec.ts` exercises API filters, staff-name/action-label search, cursor ordering without duplicates, metadata redaction, facility isolation, date validation, filter/reset navigation, refresh after a priority override and approval, retry after a failed older-page request, consent withdrawal and expired credentials. `tests/e2e/dashboard-referrals.spec.ts` verifies the MKCG case audit and consented referral path.

Local verification must use an isolated migrated and seeded `PGLITE_DATA_DIR`, with no preview server writing to that directory. The development PGlite directory must be writable. On this Windows checkout, OneDrive's read-only directory attribute prevented removal of `postmaster.pid`; clearing that attribute on database directories restored startup without deleting records. Production deployments require the configured PostgreSQL service and approved institutional identity and clinical governance.
