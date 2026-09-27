# Engineering decisions

- Patient identifiers use the stable `P-####` format.
- Uploaded report bytes are preserved in private object storage; OCR output and staff-reviewed text are stored as separate records.
- OCR-derived clinical values remain candidates until an authorized staff member verifies the text against the source file.
- Local Tesseract exists for development and engineering checks. Production requires the configured enterprise OCR service and approved data-processing controls.
- Clinical screens favor a flat, high-contrast layout that can be scanned quickly.
- Missing providers produce visible failures. The application does not generate substitute OCR or speech content.
- Priority comes from the approved deterministic ruleset. Provider output cannot lower it.
- Priority downgrades are limited to Medical Officers, require a written reason, and create an audit event.
- PGlite is limited to local single-process development. Concurrent deployment requires PostgreSQL.
- The required safety rules cannot be removed or weakened through ruleset updates.
