# Engineering decisions

- The PRD's patient ID examples differ; all IDs use `P-####`.
- The sample report is captured as synthetic text; synthetic image uploads are also supported and preserve the original file.
- Clinical screens are flat and fast: a triage tool must be instantly readable under stress.
- The landing information-layer illustration uses a CSS poster first, then lazy WebGL only on capable devices that permit motion.
- A missing configured AI key produces a visible failure in live mode.
- Reviewer priority overrides are limited to the seeded Medical Officer role; downgrades require a written reason.
- Local PGlite is a single-process demo store; PostgreSQL is required for concurrent deployment.
- Six required safety rules may not be removed or weakened by the versioned configuration editor.
