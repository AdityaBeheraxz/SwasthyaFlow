# Review, audit and receiving workflow

## Source-case review

1. Record consent and capture the patient's words and original documents.
2. Compare each OCR extraction with the original and save its verified text. The case screen shows the number of documents awaiting verification; processing stays blocked while any uploaded document is unverified.
3. Re-evaluate verified sources. A usable note is required before approval. Processing failures remain visible and can be retried.
4. A source-facility nurse can edit, request information and escalate. A source-facility Medical Officer can also approve, override priority with a written reason and create referrals.
5. Reviewer authorization keeps the primary staff session active. Verification and processing use the authenticated reviewer for audit attribution. Scoped authorization expires after 15 minutes; the page rechecks it every 30 seconds and each API request verifies it independently.

Receiving-hospital credentials cannot authorize a source case at another facility. The authorization form displays the source facility. For local development, the F-001 source reviewers include `doctor.ananya`, `doctor.vikram` and `nurse.meera`; the `receiver.scb`, `receiver.mkcg` and `receiver.vimsar` accounts belong to different pitch facilities. Accounts never gain cross-facility source access through a referral.

Concurrent review or processing requests use conditional state updates. A stale action is rejected and its transaction rolls back. The operator must refresh and inspect the current state before retrying.

## Audit inspection

- The home page has no staff-dashboard banner; reviewer queue, audit and inbox remain accessible through navigation.
- Audit queries are constrained to the authenticated facility. Detailed case queries additionally check active consent and clinical access; Medical Officers can see detailed case metadata, while facility-wide views are redacted.
- Server-side search covers action, actor ID and encounter ID, with IST date boundaries. Records are ordered newest first, then by event ID, and loaded 50 at a time with bounded cursor pagination. All data responses use private/no-store headers.
- “Hide routine access events” changes the view only. Access records remain stored. The existing database trigger rejects updates and deletes to audit rows.
- Times are displayed in IST. Event IDs remain available for authorized incident investigation. Clinical case printing remains disabled.

## Receiving referrals

The receiving workspace requires a receiving doctor's authorization without signing out the primary session. A source doctor must approve the case, select a verified recipient and record separate electronic/document-sharing consent before sending. Creating, downloading or printing a report alone does not deliver it.

The inbox offers awaiting-acceptance, accepted and all-available filters, receipt timestamps, original prescription/report links and a printable/downloadable bundle. Decisions are recorded once with actor attribution. Decline closes receiving clinical access; consent withdrawal also blocks later inbox, PDF and original-document access. Previously downloaded copies cannot be recalled.

Queries are scoped to the receiving facility and paginated. Refresh or authorization errors clear displayed clinical records. Closing the workspace invalidates pending UI loads. Automatic refresh runs every 30 seconds while the page is visible.

## Deployment status

These controls and workflows are implemented and tested locally. This does not establish clinical or production certification. Production still requires approved institutional identity integration for scoped receiving/reviewer authorization, genuinely onboarded recipient facilities, approved clinical rules and provider validation, configured India-region storage/encryption, supervised delivery workers, monitoring, backup restoration and measured load/security testing. Local pitch delivery and credential fixtures remain prohibited in production. See `REFERRALS.md` and the existing deployment/privacy documentation.
