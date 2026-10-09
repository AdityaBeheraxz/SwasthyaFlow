# SwasthyaFlow referral network MVP

## Working pitch flow

1. Intake staff obtain consent, upload prescriptions and reports independently, verify extracted text against the originals, and prepare the source-linked note.
2. For intake staff, use **Reviewer authorization** inside the case and enter credentials belonging to a same-facility nurse or Medical Officer. This creates a separate 15-minute clinical session; the main staff session remains unchanged. Nurses may edit/request information/escalate. A Medical Officer can approve, override priority and create referrals. Actions are audited with the reviewer identity. Receiving-workspace credentials do not authorize source review in another facility. The source Medical Officer approves the case, selects a named recipient, records separate handover consent and creates the referral. Creating or printing alone leaves it NOT_SENT.
3. Explain electronic sharing **including every uploaded original document**, which may contain identifying information. Record patient consent (guardian for a child), then select **Send referral with documents**.
4. An idempotent persistent delivery record freezes the document IDs, source hashes, recipient and consent timestamp. Documents uploaded later are not silently shared. A local receipt means the named receiving SwasthyaFlow workspace can access the report. It does not mean a real college received it.
5. Select **Referral inbox** inside the signed-in main dashboard, then enter the receiving doctor credentials. A distinct 15-minute receiving session is bound to the current main staff identity and facility. It never replaces the main staff cookie. **Close receiving workspace** revokes/deletes only that scoped session. Study the original prescriptions and reports, and **Accept referral** or **Decline referral**. The sender sees the receiving doctor's decision after refreshing delivery status. Acceptance does not book an appointment or supply treatment advice.
6. **Print referral report** opens an authenticated PDF in the browser viewer; use the viewer's Print command. **Download referral PDF** downloads the same bundle. After electronic document-sharing consent, the PDF appends every frozen original document. Missing, changed or oversized documents cause an explicit failure; none are silently omitted.

## Odisha pitch workspaces

Identity references: [Odisha DMET government medical college directory](https://dmet.odisha.gov.in/en/light/page/medical-colleges), checked 8 October 2026.

| Institution reference | Prototype account | Isolated receiving workspace |
|---|---|---|
| S.C.B. Medical College & Hospital, Cuttack | receiver.scb | PITCH-SCB |
| M.K.C.G. Medical College & Hospital, Berhampur | receiver.mkcg | PITCH-MKCG |
| VIMSAR, Burla | receiver.vimsar | PITCH-VIMSAR |

These are **explicitly labelled prototype workspaces**, not institutional onboarding, institutional approval, hospital staff accounts or actual hospital deliveries. Never use patient cases for the pitch; use synthetic test information. No patient or prescription records are seeded.

Provision after migrations and normal development staff provisioning:

```powershell
pnpm exec tsx --env-file=.env.local db/migrate.ts
pnpm exec tsx --env-file=.env.local db/referral-pitch.ts
```

Generated passwords are stored in ignored `.data/referral-pitch-access.txt`; optional `REFERRAL_PITCH_PASSWORD` overrides generation locally. Provisioning is forbidden in production. Directory administrators can also add government hospitals, PSU health services and registered specialists and bind them to receiving SwasthyaFlow workspaces. Entries without a workspace remain print/download only. Pitch college workspaces also have the baseline rules and recipient directories to demonstrate a source case at MKCG being referred to SCB or VIMSAR after medical approval.

## Access and confidentiality

The main navigation opens **Referrals** at `/referrals`. Its **Refer patients** tab lists source-facility patients with active consent, with filters for ready cases, cases needing review, existing referrals and all active cases. Search uses the recorded patient name or reference in a POST body rather than putting it in the request URL. Approved cases open doctor authorization, recipient selection, consent, PDF download and delivery within this tab. The case-review page has a compact direct link to `/referrals?case=<encounter-id>` instead of another referral form. Unreviewed cases link to their source evidence and review workflow; risk priority alone never authorizes referral. Completed cases remain available through Existing referrals while consent remains active.

The **Acceptance inbox** tab stays at `/referrals/inbox` so existing links continue to work. It requires the receiving doctor's separate workspace credentials, shows only referrals delivered to that facility, and keeps the main staff and source-reviewer sessions intact. The source worklist endpoint returns case metadata and delivery/decision status; it does not include complaints, note bodies or original documents. Source case details retain the existing audited access checks.

- Source-facility doctors can create referrals only after approved review, active intake consent and separate recipient consent. Electronic consent includes originals and is audited independently.
- Receiving-facility doctors can access only referrals explicitly delivered to their assigned workspace. They receive the fixed report and fixed attachments, never general access to the source encounter, audio, source facility queue or other recipients' cases. Administrators and intake roles cannot open receiving clinical inboxes.
- Every original-document request checks recipient binding, active consent, active directory entry, snapshot membership and SHA-256 integrity. Report and document access is audited with IDs; clinical text, filenames and patient names are not written into those audit events.
- Withdrawal blocks further inbox, attachment and PDF access. Deactivation also blocks access. Decline removes subsequent receiving clinical access. Previously read/printed/downloaded information cannot be recalled.
- PDF images preserve originals; PDF source pages are copied without interactive annotations or page actions. Unicode cover text relies on Hindi/Odia-capable fonts. Bundle limits: 20 source documents, 30 MiB total input and 80 pages for PDF sources. A source separator labels prescription pages as existing source evidence, never newly generated treatment instructions.
- Referral/delivery rows and snapshot attachment references are removed together by a foreign-key cascade on privacy purge and retention deletion. Original storage deletion follows the existing retention workflow.

## Delivery operation and deployment boundary

`REFERRAL_DELIVERY_MODE=local` enables the pitch and is disabled in production. `internal` enables SwasthyaFlow-to-SwasthyaFlow delivery; the receiver must be genuinely onboarded with `facilities.settings.referralAcceptanceApproved=true`, and cannot have `prototypeOnly=true`. All existing production identity, TLS, India storage/encryption and clinical/privacy validation gates still apply. Settings flags record an operator decision; they do not establish legal approval by themselves.

The first attempt runs immediately. Durable jobs use atomic compare-and-set claims, a 60-second lease, a stable referral idempotency key, capped exponential backoff and a five-attempt limit. An unconfirmed transport never reports successful receipt. Concurrent workers can claim distinct jobs. Configure a supervisor/scheduler to run `pnpm referrals:dispatch` at least once per minute; export configuration securely into that process. For local one-shot recovery:

```powershell
pnpm exec tsx --env-file=.env.local --conditions=react-server db/referral-worker.ts
```

The worker processes at most 25 due jobs per invocation. Large installations need PostgreSQL rather than PGlite, managed device/storage encryption, monitoring of failed/retrying jobs, verified operator procedures, a supervised worker fleet, restoration exercises and measured load capacity. This implementation is a tested prototype, not evidence of national-scale operation or clinical certification.

An HTTPS JSON connector interface and strict receipt parser are available for future external software. Configuration is environment-only (`REFERRAL_CONNECTORS_JSON`, per-connector bearer credential variable, `REFERRAL_EXTERNAL_SHARING_APPROVED` and existing external-processing controls). The send route currently **blocks external original-document transport** pending an approved receiver contract. No ABDM/ABHA integration, third-party hospital connection, public sharing link, email delivery, appointment booking or FHIR conformance certification is claimed.


