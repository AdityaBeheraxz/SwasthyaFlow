# Remaining PRD implementation

Updated 8 October 2026. The following work extends the existing intake, safety, authentication and review workflows.

The confidentiality policy now disables unrestricted export and case printing, denies administrators clinical reads, minimizes queues, records guardian consent and withdrawals, revokes signed-out sessions and blocks external providers without explicit India/no-training/no-retention approvals. These are intentional policy restrictions. See [INDIA_PRIVACY_SAFETY.md](INDIA_PRIVACY_SAFETY.md). India-specific model training, clinical validation, contractual processor verification and deployment certification remain outstanding.

| Previously partial area | Implemented in this update | Remaining boundary |
|---|---|---|
| Hindi/Odia provider pipeline | Independent interfaces, exact registered fixtures, configurable endpoints; local Whisper ASR now installed for English/Hindi | Local Odia ASR unavailable; no approved endpoints, deployed IndicTrans2 or clinical language accuracy validation supplied |
| Report extraction | Separate multi-file prescription/report intake; explicit medicine names, strengths, schedules and durations with source text; lab values remain separate | No interpretation of reference ranges; unreadable or unsupported prescription layouts require manual transcription |
| PDF OCR | Local rasterization and per-page OCR with bounded dimensions and time limits | Poppler must be installed on deployment; approved enterprise OCR required in production |
| Report inspection | Low-confidence token boxes over processed local pages, page selector, source values and immutable originals | External provider coordinate transforms need validation before overlays |
| Image quality | Contrast normalization, denoising, sharpening, optional adaptive threshold; blur, light, tilt and edge warnings | Automatic deskew/perspective correction is not implemented |
| Facts and timelines | Source spans, known/unknown/unclear measurements, chronological relative events, context questions | Deterministic local extraction is a limited vocabulary, not a general clinical language model |
| Reviewer corrections | Symptoms, duration, history, medications, timeline, missing/ambiguous information, questions, evidence and summary edits; before/after review record; rules re-evaluated with RED preservation | Real reviewer acceptance testing remains required |
| Report corrections | Corrected text stored separately; changed sources reset review and require re-evaluation | Completed encounters remain immutable |
| Queue | Server-side priority, language, state, input filters; oldest-waiting/newest sorting; RED first; pagination | Operational load testing not performed |
| Offline capture | AES-GCM envelopes for new text/media drafts, per-staff visibility, session-bound capture, stable IDs, checkpoints, conflict rejection, upload of retained recordings/reports | Browser/device compromise not mitigated by local encryption; earlier unowned plaintext drafts require manual handling |
| Mobile capture | Device camera file capture and document preview | Device-specific testing remains required |
| Operations | Server timings for intake, OCR, translation, extraction and speech; p50/p95/failures; facility reviewer analytics and visible alert conditions | External alert delivery and observability integration not configured |
| Governance | Administrator facility identity, contacts, retention, processors and consent notice; auditable changes; per-facility retention job | Organization must supply actual policies and run retention scheduling |

See [PROVIDERS.md](PROVIDERS.md) for configuration and contracts. Engineering tests do not authorize patient use. External provider validation and clinical release evidence remain in [CLINICAL_RELEASE.md](CLINICAL_RELEASE.md).

## Referral MVP (8 October 2026)
Administrator-managed verified recipients, doctor-approved referral snapshots, separate patient/guardian consent and audited confidential PDF downloads implemented. Printed PDF bundles, original prescription/report attachments, persistent idempotent delivery, receiving-facility inbox and doctor acceptance/decline are implemented. Three explicitly labelled Odisha prototype college workspaces can be provisioned; no institutional affiliation is claimed. Production internal routing requires approved onboarding and deployment gates. External hospital document transport and ABDM integration are not connected. See REFERRALS.md.

