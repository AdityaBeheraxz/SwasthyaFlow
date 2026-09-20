# SwasthyaFlow

Educational, synthetic-data prototype for AI-assisted frontline triage and human-led review. It does not diagnose, prescribe, or recommend treatment.

## Local run

Requires Node 20+ and pnpm. In this directory:

```sh
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

Open http://localhost:3000 and select a demo role in the header. No external key is needed for mock mode. Set `AUTH_SECRET` in `.env.local` before sharing a deployment.

## Modes and storage

With no `DATABASE_URL`, PGlite stores data in `.data/`. Run one development server at a time against this file. Set `DATABASE_URL` for PostgreSQL; `docker-compose.yml` provides a local instance. `AI_MODE=mock` is the default and uses synthetic speech, OCR, translation, and extraction. `AI_MODE=live` uses `AI_API_KEY` for Gemini, `SPEECH_TO_TEXT_API_KEY` for Whisper, a local Tesseract executable with English/Hindi/Odia language data, and an IndicTrans2-compatible endpoint through `TRANSLATION_API_URL` and `TRANSLATION_API_KEY`. All live providers fail visibly when unavailable.

Report and audio files are stored locally under `.data/` and are served only to signed-in demo roles. The basic offline mode caches the app shell and queues text intake in IndexedDB until a server write succeeds. Image files are not queued offline.

For deployment on a GitHub-connected platform, configure PostgreSQL and a long random `AUTH_SECRET`. The local file storage in this prototype needs a durable storage adapter before deployment on an ephemeral host such as Vercel.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

## Current limitations

The original request describes a larger 12-phase application. This build includes safety rules, a seeded queue, consented text and voice intake, report text and file capture, mock triage, review, override, referral, audit, local offline text sync, a versioned rules editor, and a lazy landing scene. Live providers are wired but were not verified with real credentials or models. Tesseract image preprocessing, full source-box highlighting, audio sync while offline, production storage, and complete failure simulation coverage remain incomplete. The local demo is not suitable for clinical use. No clinical performance validation has been done.

See [the acceptance review](docs/ACCEPTANCE.md) for the result of each requested check and the engineering deviations.
