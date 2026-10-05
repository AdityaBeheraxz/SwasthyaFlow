# Engineering decisions

- Patient identifiers use the stable `P-####` format.
- Uploaded report bytes are preserved in private object storage; OCR output and staff-reviewed text are stored as separate records.
- OCR-derived clinical values remain candidates until an authorized staff member verifies the text against the source file.
- Local Tesseract exists for development and engineering checks. Production requires the configured enterprise OCR service and approved data-processing controls.
- Clinical screens favor a flat, high-contrast layout that can be scanned quickly.
- Missing providers produce visible failures. The application does not generate substitute OCR or speech content.
- Engineering fixtures require explicit environment selection and an exact registered input or file hash. They cannot run in the production profile.
- New offline drafts encrypt content and media; sync checkpoints and stable IDs prevent duplicate intake records on retries.
- Corrected report sources require fresh processing before approval. Structured reviewer corrections preserve RED priority and record before/after facts.
- Priority comes from the approved deterministic ruleset. Provider output cannot lower it.
- Priority downgrades are limited to Medical Officers, require a written reason, and create an audit event.
- PGlite is limited to local single-process development. Concurrent deployment requires PostgreSQL.
- The required safety rules cannot be removed or weakened through ruleset updates.
