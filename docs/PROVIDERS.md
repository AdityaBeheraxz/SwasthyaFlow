# Provider interfaces and engineering fixtures

ASR, translation, OCR and fact extraction have separate interfaces and environment selectors. Endpoint URLs, models and credentials come from environment variables. The committed `.env.example` lists names without values. Empty variables use the documented local defaults; live adapters require their credentials and URLs.

All remote adapters are additionally denied unless EXTERNAL_PROCESSING_APPROVED, PROVIDER_NO_TRAINING_APPROVED and PROVIDER_NO_RETENTION_APPROVED are explicitly true, PROVIDER_DATA_REGION is IN and ALLOWED_PROVIDER_ORIGINS contains the exact HTTPS origin. Redirects are refused. Do not set approval flags without contract and deployment evidence. These requirements apply in development too. See [INDIA_PRIVACY_SAFETY.md](INDIA_PRIVACY_SAFETY.md).

| Stage | Environment selector | Local choices | Endpoint configuration |
|---|---|---|---|
| Speech | ASR_MODE | local, unavailable, fixture | LOCAL_ASR_PYTHON, LOCAL_ASR_MODEL_PATH; or SPEECH_TO_TEXT_API_URL, SPEECH_TO_TEXT_MODEL, SPEECH_TO_TEXT_API_KEY |
| IndicTrans2 | TRANSLATION_MODE | local, fixture | TRANSLATION_API_URL, TRANSLATION_API_KEY |
| OCR | OCR_MODE | tesseract, fixture | OCR_API_URL, OCR_API_KEY, OCR_LANGUAGES |
| Extraction | EXTRACTION_MODE | local, fixture | EXTRACTION_API_URL, EXTRACTION_API_KEY |

Live/enterprise speech expects an OpenAI-compatible multipart transcription contract: `file`, `language`, `model`, `response_format=verbose_json`. Response: `text`, optional `language`, optional timestamped `segments` with `avg_logprob`. Confidence derived from log probability is a review signal, not calibrated clinical accuracy. A custom ASR server needs to expose this contract or adapt the interface.

Translation receives JSON `{text, source_language, target_language:"en", model:"IndicTrans2"}`. It must return `{normalized, ambiguousSpans:[{original, normalized, reason}]}`. The app does not bundle or run IndicTrans2 weights. Local mode recognizes a limited vocabulary and is not a general translation model.

Enterprise extraction receives `{schema_version:"swasthyaflow-facts-v1", task:"extract_non_diagnostic_facts", source}`; its response must match `lib/ai/types.ts`. Invalid facts or diagnosis/treatment output stop processing. `review_priority` must be `PENDING_RULE_ENGINE`; the server computes priority. Development `live` extraction uses the Gemini response contract with `AI_API_URL` and `AI_API_KEY`.

Enterprise OCR receives multipart `document`, `languages`, `include_tokens=true`. Response: `rawText`, `tokens:[{text,confidence,bbox:[x0,y0,x1,y1],page}]`, optional `warnings`, optional `pages:[{page,width,height}]`. Token confidence must be between zero and one. Coordinates from external providers are preserved; page overlays currently use the local Tesseract preprocessing coordinate system.

## Running fixtures

Set ASR_MODE, TRANSLATION_MODE, OCR_MODE and EXTRACTION_MODE to `fixture` in your local environment. Restart the server. The visible banner identifies fixture mode.

`fixtures/providers.json` registers exact Hindi/Odia phrases and source hashes. `PROVIDER_FIXTURES_PATH` can point to another manifest. Unknown recordings, reports or text are rejected; the app never substitutes a fixture result for arbitrary input.

`speech-hi.bin` and `speech-or.bin` are **engineering byte vectors**, not recordings. They test the ASR adapter directly and intentionally do not pass the WebM upload validator. The report PNGs are labelled engineering fixtures. These files establish interface behavior only. They are not accuracy samples, patient data or clinical validation.

All provider selectors reject fixture/local/live modes in the production profile. Production requires enterprise endpoints and existing provider approval gates. No live endpoints were supplied or tested. [Local speech](LOCAL_SPEECH.md) uses an installed CPU model without an API key and supports English/Hindi.

## Local OCR and documents

Tesseract uses configured language packs. PNG/JPEG preprocessing includes orientation metadata, resizing, contrast normalization, denoising and sharpening. Adaptive thresholding is opt-in through OCR_ADAPTIVE_THRESHOLD. Warnings flag low resolution, blur, uneven lighting, dark images, possible cropped edges and estimated text tilt; they do not prove document validity.

PDF pages are rasterized by Poppler `pdftoppm` (set PDF_RENDERER_PATH when it is not on PATH). Each page is capped at 2400 pixels, ten pages maximum, with rendering and recognition time limits. Local OCR preserves page dimensions and token coordinates. Staff must check the original before any candidate lab value affects rules. Automatic skew correction and clinical interpretation of reference ranges are not provided.

## Offline storage

New offline drafts encrypt text, age, media and sync checkpoints using AES-GCM with a non-exportable key in IndexedDB. A cached staff identity permits capture for up to eight hours in the same browser session. Synchronization requires a fresh server identity matching the draft's staff member and facility. Stable server IDs and checkpoints allow interrupted sync to resume; incompatible replays return SYNC_CONFLICT.

The key is stored on the same device: encryption limits casual inspection of IndexedDB records, but does not protect against compromised browser scripts, a compromised device or someone with access to the active staff session. Sign out removes the cached identity. Keep device security and session controls enabled. Earlier plaintext drafts are not silently claimed by a different staff member.

Report files sync as unverified sources. Open the encounter, run OCR, confirm the source and process the intake afterward. A recording entered offline retains its original bytes and staff-entered transcript; it is not automatically passed through ASR. Browser camera capture depends on device support.
