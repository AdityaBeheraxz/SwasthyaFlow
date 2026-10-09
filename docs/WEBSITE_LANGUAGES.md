# Website languages

Use the language select in the header to choose English, Hindi or Odia. It stays visible on mobile, works without an external translation service, and stores only the language code in a one-year `sf_ui_language` preference cookie. The server reads that preference for the initial render; an invalid code falls back to English.

The language provider translates authored interface text from `lib/ui-catalog.ts`. Translated labels preserve the original API option values, route paths and clinical state codes. Switching language does not remount forms or clear entered values. Patient language remains a separate intake field.

Patient names, source quotes, original words, recorded prescriptions, document filenames and clinical narratives retain their original contents. Referral PDF contents and raw technical audit metadata also retain their recorded form. Unknown technical messages fall back to their original text; known errors retain the diagnostic code and translate their explanation.

Hindi and Odia use the existing Noto fonts. The workflow uses vertical reveals for these languages so longer text remains readable. The safety board renders complete Indic words rather than splitting consonant conjuncts into individual cells. English keeps the horizontal timeline and flap board.

For new interface text, add both translations to the catalog and render it through `T` or `useUiLanguage().t`. Do not pass patient narratives to those helpers. Qualified language and privacy reviewers should validate consent and safety wording before a clinical release.

Checks: `tests/ui-language.test.ts` validates catalog completeness and fallback behavior. `tests/e2e/ui-language.spec.ts` checks switching, persistence, mobile layout, dark theme, patient field preservation and unchanged API enum values.
