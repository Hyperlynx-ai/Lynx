# Handoff: where the work stands (2026-11-26)

Read this first if you are an agent (or a teammate) picking up the work. It
summarises the state of the project, what is unfinished, how we work, and
the traps we already fell into. Everything else lives in the repository:
`AGENTS.md` (rules for every agent), `docs/roadmap.md` (all phases and
chunks), `docs/known-limitations.md` (KL-01…KL-20), `docs/decisions/`
(ADRs 0001–0010), `docs/policies/`, `infra/README.md` (accounts, projects,
environment variables, Vercel quirks).

## 1. The product

**Hyperlynx** is a job platform with an AI agent called **Lynx**. Candidates
(mainly from India) look for jobs, internships and scholarships in the UAE,
Europe and 25+ other countries; recruiters find verified candidates. It
replaces the old "Hyperlynx Academy" site.

The owner's 12 requirements (all must be built before the demo; no deadline):

1. Sign-up / login with email and Google.
2. Separate candidate and recruiter logins and flows.
3. AI-ranked opportunity cards for candidates.
4. A CV section: AI edits and format conversion (PDF / DOCX).
5. Recruiter onboarding.
6. AI-ranked candidate search for recruiters.
7. External jobs (every free source, scraping included) plus affiliated
   jobs, shown with an "Affiliated" tag.
8. AI interviews (a main selling point): LiveKit, video; recruiters see
   results (and recordings if the candidate opts in); retake every 30 days;
   proctoring in v1.
9. Job-specific interviews.
10. Email job alerts every 2 days.
11. A fully automatic, personalised weekly newsletter (Resend).
12. A profile page showing what Lynx knows about the candidate.

Other owner decisions: three services (Next.js web, Fastify API, Python AI
service); Supabase; a model-agnostic AI layer (Chinese and niche models
too); recruiters see full candidate profiles; Vercel hosting; red is used
for errors only (design skill rule 7).

## 2. How we work (owner's working agreement)

- **Build only what was asked.** Be proactive with questions, and always
  give a recommendation with them.
- Work like a team of engineers: **one feature branch per roadmap chunk**
  (`feat/p<phase>-<name>`), small logical commits, a PR to `main` per
  chunk. **Never push to `main`** (a git hook blocks it). Commit as
  `Sujaanb`. The owner merges PRs (use "Create a merge commit"); PRs touching
  protected areas (`supabase/migrations`, `services/ai/config/models.yaml`,
  auth, CI) need the owner's review — say so in the PR description.
- PR descriptions: what changed for users, how it works, protected areas,
  known limitations added, what was checked. End with the Claude Code line.
  Commits end with a `Co-Authored-By:` line for the agent.
- **Log every limitation** you can't resolve now in
  `docs/known-limitations.md` (next free `KL-` number) in the same PR.
- **Design:** every UI change follows the `void-terminal-glass` skill
  (`.agents/skills/void-terminal-glass/`, mirrored to `.claude/skills/`):
  black canvas, zero radius, Inter + GeistMono, rationed mint `#34D59A`,
  red `#FF5F57` for errors only, fused white/gray headlines. Load the skill
  before writing UI.
- **Agent-agnostic:** skills and configs live in `.agents/`; run
  `node scripts/agents-sync.mjs` after editing them (CI checks the mirrors).
- Update `docs/roadmap.md` chunk status (In review / Done) in each PR.
- Speed and demo first; reuse open source (check licences, note in
  `docs/third-party.md`); keep the structure simple.

## 3. Accounts and environments

- **GitHub:** org `Hyperlynx-ai`, repo `Lynx` (public, see ADR 0009). Owner's
  account: `Sujaanb`. `gh` is logged in. Setting GitHub secrets from an
  agent is blocked: give the owner the commands instead.
- **Vercel** (scope `sujaan-bhattacharyyas-projects`, Hobby plan, region
  `bom1`): projects `lynx-web`, `lynx-api`, `lynx-ai`.
  Production: https://lynx-web-pi.vercel.app, https://lynx-api-silk.vercel.app,
  https://lynx-ai-two.vercel.app. Every PR gets previews (they use the
  staging database, KL-08). The `vercel` CLI is logged in. **Do not touch
  the `hyperlynx-frontend` project or the hyperlynx.ai domain.**
- **Supabase** (Mumbai): `lynx-staging` = `kwzwcoawnapdyddaiajk`,
  `lynx-prod` = `xwtgskwnoasqxcrqrkdt`. Migrations reach both through the
  `db-migrate.yml` workflow when a PR merges to `main`. Local stack in
  Docker (`pnpm db:start`).
- **AI:** primary provider **NVIDIA NIM** (`NVIDIA_API_KEY`, OpenAI-compatible,
  declared as `nvidia` in `services/ai/config/models.yaml`): MiniMax M3.1
  Flash, then GLM 5.3 Flash, then Gemini (`GOOGLE_API_KEY`) as fallbacks.
  Test/synthetic data only (KL-05, policy AI-02). Free tiers: Gemini allows
  20 requests per day per model (KL-20); NIM models get retired (KL-21) —
  list them with `GET https://integrate.api.nvidia.com/v1/models`.
- Secrets: real values only in git-ignored `.env.local` files and in
  Vercel / Supabase / GitHub settings. Never print or commit them.
- The owner runs an Anaconda `python -m http.server` on port 8000 — never
  kill it; that's why the AI service runs on **port 4500** locally.

## 4. Architecture (short)

- `apps/web` — Next.js 16 (App Router, `proxy.ts`), Tailwind v4 with the
  design tokens, `packages/ui` components. Browser talks only to the web
  app; `/api/*` is rewritten to `apps/api`. Server actions call the API
  with the user's token (`apiFetchAsUser`).
- `apps/api` — Fastify 5 + zod; OpenAPI → `packages/types`
  (`pnpm api:types` after route changes). Verifies Supabase JWTs. Candidate
  data is read/written **as the user** (publishable key + their token, so
  row-level security applies); the secret key only for admin things and
  `ai_calls`. AI calls go through `aiClient.call(task, ...)`: per-user daily
  caps (`modules/ai/caps.ts`) and one `ai_calls` row per call.
- `services/ai` — FastAPI + Pydantic AI. Tasks: `ping`, `cv_parse`,
  `facts_extract`, `cv_edit` (models in `config/models.yaml`, prompts in
  `prompts/`, evals in `evals/` with synthetic CVs; results committed in
  `evals/results/`). Only reachable with the service token.
- `packages/shared` — zod schemas and helpers shared by web and API:
  `cv.ts` (CvData), `candidate.ts`, `facts.ts`, `cv-edit.ts` (sections,
  `guardEdit` AI-08 honesty check, `cleanCv`), `policy.ts`
  (`AI_TEST_DATA_ONLY`).
- Database tables so far: `profiles`, `ai_calls`, `cvs`, `cv_versions`,
  `candidates`, `consents` (append-only), `lynx_facts`; storage bucket
  `cvs` (`cvs/<user id>/...`). pgTAP tests in `supabase/tests/database`.

## 5. Status

- **Phase 0, Phase 1: done.**
- **Phase 2** (candidate onboarding, profile, CV and Lynx memory): **all
  chunks built.**
  - 2.1 AI foundation (PR #67), 2.2 CV upload and parsing (PR #68),
    2.3 onboarding (PR #69), 2.4 What Lynx knows / download my data
    (PR #70): merged and verified on production.
  - 2.5 CV editor (Ask Lynx with diffs, tailor to a role, versions, matching
    CV; NVIDIA NIM as AI provider): PR #71.
  - 2.6 PDF and Word export, three templates (classic / modern / compact),
    made in the browser: PR on branch `feat/p2-cv-export` (stacked on #71).
  - Left: merge #71 then the 2.6 PR, then the Phase 2 "done when" check on
    production (a new candidate goes from CV upload to an AI-edited CV
    downloaded as PDF and DOCX). Creating an account on production needs
    the owner's OK, so the owner runs it, or approves a synthetic account.
- **Phase 3 onwards:** not started. See `docs/roadmap.md`: Phase 3 = jobs
  engine and opportunities feed; then recruiters, AI interviews, recruiter
  search, Lynx assistant, emails, Academy migration, demo hardening. Ask the
  owner the open questions for a phase (with recommendations) before
  building it.

## 6. Evals (policy AI-04)

Every AI task has an eval in `services/ai/evals/` (synthetic data); results
are committed in `evals/results/`. Current (MiniMax M3.1 Flash): cv_parse
1.0, facts_extract 0.979, cv_edit 1.0. Run one after any prompt or model
change and commit the result; the free quotas are small, so run them one at
a time.

## 7. Commands

| What | Command |
|---|---|
| Install | `pnpm install` (Python: `uv sync` in `services/ai`) |
| Run everything (web 3000, api 4000, ai 4500) | `pnpm dev` |
| Local database | `pnpm db:start`, then `pnpm db:env` (writes `.env.local` keys) |
| Apply new migrations locally | `pnpm supabase migration up --local` |
| Database tests | `pnpm db:test` |
| All JS checks | `pnpm turbo run lint typecheck test build` |
| AI service checks | in `services/ai`: `uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest -q` |
| Browser tests | `pnpm e2e` (or `pnpm --filter web exec playwright test`) |
| AI evals (real model, uses quota) | `pnpm ai:eval` / `uv run python -m evals.facts_extract` |
| After API route changes | `pnpm api:types` |
| After editing a shared file the API uses | `pnpm shared:sync` |
| After editing `.agents/` | `node scripts/agents-sync.mjs` |
| Migration rules | `node scripts/check-migrations.mjs origin/main` |
| Make someone admin | `pnpm admin:set-role <email> admin [--env staging\|production --yes]` |

Local test candidate (synthetic): `onboard-2311@example.test`, password =
`PASSWORD` in `apps/web/e2e/helpers.ts`. It has a parsed sample CV, an
onboarding profile, facts and CV versions 1–2.

## 8. Traps we already hit (read these)

- **KL-19: the deployed API can't import workspace TypeScript packages.**
  Never import `@lynx/shared` in `apps/api` (ESLint blocks it). Add the file
  to `FILES` in `scripts/shared-sync.mjs`, run `pnpm shared:sync`, import
  from `apps/api/src/shared/`. CI checks the copies.
- **KL-15: Vercel compiles the API with strict mode off.** `pnpm typecheck`
  runs an extra non-strict check; zod's nullable fields become optional
  there, so shared helper types should accept optional fields.
- **The local dev servers kept dying:** `uvicorn --reload` on Windows stops
  its worker with a console Ctrl+C that also kills Turborepo (web + API).
  `services/ai/dev.py` restarts uvicorn by terminating it instead. Don't go
  back to `--reload`.
- **AI free tiers:** Gemini allows 20 requests/day per model and refuses
  parallel requests; NIM retires models. Keep AI calls sequential, keep the
  fallback chain, and set `timeout_s` per task in `models.yaml`.
- **Docker Desktop** may not be running after a restart: the local database
  needs it (`pnpm db:start`). It's installed under
  `%LOCALAPPDATA%\Programs\DockerDesktop`.
- **e2e without AI:** tests that need a parsed CV seed one with
  `seedParsedCv()` (apps/web/e2e/helpers.ts); CI has no AI service.
- Vercel: the API entry must stay `apps/api/src/server.ts` (no `app.ts` or
  `index.ts` in `src/`); new build-time env vars go into `turbo.json`.
- New API env vars: add to `apps/api/src/env.ts`, `.env.example`,
  `scripts/local-env.mjs` (if local), Vercel (production = prod project,
  preview = staging), and `infra/README.md`.
- Next.js prints a hidden `role="alert"` route announcer: in Playwright,
  match alerts by text (`expectAlert`).
- New candidates are redirected from `/app` to `/app/onboarding` until
  onboarding is complete; e2e tests use `onboardedCandidate()`.
- Pages with an AI call take 15–60 s; show a mono `LoadingState`.
