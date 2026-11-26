# infra/: deployment

How Hyperlynx is deployed. **Protected area**: the owner approves changes.
Decisions: `docs/decisions/0005-hosting.md`.

## Accounts

| Service | Account | Notes |
|---|---|---|
| GitHub | org `Hyperlynx-ai` (owners: `Sujaanb`, `sujaan-web`) | Commit and merge as `Sujaanb`. |
| Vercel | owner's personal Hobby account (scope `sujaan-bhattacharyyas-projects`), GitHub login connection `Sujaanb` | On Hobby, only commits authored by `Sujaanb` deploy. |
| Supabase | owner's personal org (`Sujaanb's Org`), signed in through GitHub `Sujaanb` | |

The same Vercel account also hosts `hyperlynx-frontend`, which serves
`www.hyperlynx.ai`. Leave it alone; the domain moves to `lynx-web` only when
the owner decides. The domain's DNS is at a third-party provider (not Vercel
DNS), so new DNS records (e.g. for email sending) are added there.

## Vercel

| Project | ID | Root directory | Framework | Region |
|---|---|---|---|---|
| `lynx-web` | `prj_yDAXoM3O52htt2A4fkoqMAtXdbJL` | `apps/web` | Next.js | `bom1` (Mumbai) |
| `lynx-api` | `prj_sFEYZ2JalCln3t8KZjQkrqcUKPpk` | `apps/api` | Fastify | `bom1` |
| `lynx-ai` | `prj_WhRCtUV7g4eR0RDkBAoApNeBgI2f` | `services/ai` | FastAPI | `bom1` |

- Each app has a `vercel.json` (region, and `relatedProjects` so `lynx-web`
  finds the matching `lynx-api` deployment, and `lynx-api` finds `lynx-ai`:
  production → production, PR preview → same-branch preview).
- `main` deploys to production; every PR gets preview deployments.
- Node.js 22 for `lynx-web` and `lynx-api`; Python 3.12 (`.python-version`) for
  `lynx-ai`.

### Environment variables

| Project | Variable | Environments | Notes |
|---|---|---|---|
| `lynx-web`, `lynx-api` | `ENABLE_EXPERIMENTAL_COREPACK=1` | all | lets Vercel use pnpm 12 from `packageManager` |
| `lynx-api`, `lynx-ai` | `AI_SERVICE_TOKEN` | production, preview (different values) | shared secret for API → AI calls |
| `lynx-ai` | `NVIDIA_API_KEY` | production, preview | NVIDIA NIM, the primary AI provider (MiniMax M3.1 Flash); test data only (AI-02) |
| `lynx-ai` | `GOOGLE_API_KEY` | production, preview | Gemini, fallback models (policy AI-02: test data only for now) |
| `lynx-api` | `SUPABASE_URL` | production (lynx-prod), preview (lynx-staging) | Supabase project URL |
| `lynx-api` | `SUPABASE_SECRET_KEY` | production, preview (per project) | server-only; bypasses row-level security |
| `lynx-api` | `SUPABASE_PUBLISHABLE_KEY` | production, preview (per project) | for queries made as the signed-in user (CVs and other candidate data) |

`S=sujaan-bhattacharyyas-projects`, then:
- list: `vercel env ls --scope $S --project <project>`
- add: `vercel env add <NAME> --environment <env> --scope $S --project <project> --sensitive`
  (the value is read from the terminal; never put it in a file in the repo).

### Deployment Protection (owner setting)

Vercel protects every `*.vercel.app` URL, production included, with a Vercel
login by default. In each project's Settings → Deployment Protection:
- `lynx-web`: Vercel Authentication → "Only Preview Deployments" (the public
  site must be reachable).
- `lynx-api`, `lynx-ai`: Vercel Authentication → disabled. They are called
  server-to-server (web → api → ai) and protect themselves (login tokens,
  service token).

### Jobs ingestion (GitHub Actions, ADR 0011)

`.github/workflows/jobs-ingest.yml` runs `python -m lynx_ai.jobs` in
`services/ai`: daily at 01:30 UTC for every enabled source (production),
hourly for sources an admin asked to "Run now", and manually from
Actions -> Jobs ingestion -> Run workflow (choose production or staging, and
optionally some sources). It finds each project's connection pooler through
the Supabase Management API (`scripts/ci/supabase-db-url.py`).

Repository secrets it reads (set with `gh secret set NAME --repo
Hyperlynx-ai/Lynx`, which prompts for the value): `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_PROD_DB_PASSWORD`, `SUPABASE_STAGING_DB_PASSWORD` (already set),
`CURATED_SHEET_ID`, `CAREERJET_API_KEY`, `REED_API_KEY`. A missing key only fails that source.

Locally: `pnpm db:start`, then in `services/ai`: `uv run python -m
lynx_ai.jobs check` or `run --source <id>` (uses `DATABASE_URL` from
`.env.local`).

### Vercel quirks (keep these or deployments break)

- **`apps/api` entry:** Vercel looks for `src/app.ts`, `src/index.ts` or
  `src/server.ts` (in that order) and needs that file to import `fastify`.
  Our entry is `src/server.ts`; never add a `src/app.ts` or `src/index.ts`.
  On Vercel it exports a request handler; `listen()` runs only locally.
- **Type resolution:** Vercel's TypeScript compile for `apps/api` does not
  follow pnpm symlinks, so `pnpm-workspace.yaml` hoists every package to the
  root `node_modules` (`publicHoistPattern: "*"`).
- **`services/ai` install:** its small `package.json` (for Turborepo) makes
  Vercel run `pnpm install`, which would skip the Python install. So
  `services/ai/vercel.json` sets `installCommand` to
  `uv sync --frozen --no-dev`.
- **Build cache:** `turbo.json` lists `API_URL`, `AI_SERVICE_URL`,
  `VERCEL_ENV`, `VERCEL_RELATED_PROJECTS` and `NEXT_PUBLIC_*` as build
  inputs. The API address is baked into the web build, so without this,
  Turborepo's cache reused an old build pointing at the wrong API.
  Add any new build-time variable there.
- **Cold starts:** the API waits up to 10 s for the AI service's health
  check, because a cold Python function can take several seconds.
- **Plan:** Vercel Hobby cannot connect a private repository owned by a
  GitHub organization. The repository is public for that reason (ADR 0009);
  making it private again requires Vercel Pro first.
- **Related projects** (web → api → ai URLs) only work for Git deployments.
  A manual `vercel deploy` of the API reports `"ai": "unreachable"`; that is
  expected.

### Verify a deployment

```
vercel curl https://<deployment-url>/health --scope sujaan-bhattacharyyas-projects
vercel logs <deployment-url> --scope sujaan-bhattacharyyas-projects
```

## Supabase

See `supabase/AGENTS.md`. Projects: `lynx-staging` (`kwzwcoawnapdyddaiajk`)
and `lynx-prod` (`xwtgskwnoasqxcrqrkdt`), both in Mumbai. Migrations reach
them only through `.github/workflows/db-migrate.yml`.

## Roles and admins

Roles are `candidate`, `recruiter` and `admin`. Nobody can give themselves a
role from the website; the owner changes roles with:

```
pnpm admin:set-role <email> <candidate|recruiter|admin>                          # local
pnpm admin:set-role <email> <candidate|recruiter|admin> --env staging --yes
pnpm admin:set-role <email> <candidate|recruiter|admin> --env production --yes
```

Hosted environments use the owner's Supabase CLI login (`pnpm supabase
login`) to fetch the secret key; it is never printed or saved. The account
must exist first (sign up on the site).

## Coming later

- LiveKit Cloud (interviews), Phase 5: `services/interview-agent`.
- Inngest (background jobs), Phase 3.
- Resend (email), Phases 1 and 8.
