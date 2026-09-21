# SwasthyaFlow

AI-assisted intake, deterministic safety prioritization, and qualified human review for frontline health workflows. The repository has two modes:

- **Demo:** synthetic data, local PGlite, local files, mock providers, and the role switcher.
- **Production candidate:** PostgreSQL, OIDC, facility isolation, approved enterprise providers, encrypted object storage, clinical rules approval, retention, readiness checks, and fail-closed configuration.

## Local preview

Requires Node 20+ and pnpm.

```sh
pnpm install
pnpm db:migrate
pnpm seed
pnpm dev
```

Open http://localhost:3000. Demo mode does not require external provider keys.

## Production configuration

Copy `.env.example` into the deployment secret store and fill every production value. Set `DEPLOYMENT_MODE=production` and `AI_MODE=enterprise`. The readiness endpoint returns 503 while any gate is incomplete.

The public Gemini Developer API adapter is retained only for nonclinical development with `AI_MODE=live`. Production uses the contractually approved endpoint configured by `EXTRACTION_API_URL`. Provider approval flags record an external governance decision; operators must retain its supporting contract and assessment.

Run migrations before traffic reaches a new release:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm start
```

Schedule `pnpm retention:run` and alert on failure. See [Clinical release gate](docs/CLINICAL_RELEASE.md) for deployment, validation, regulatory, security, and operational evidence required before patient use.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Automated checks verify software behavior. Clinical performance and regulatory approval require evidence and accountable signoff outside this repository.
