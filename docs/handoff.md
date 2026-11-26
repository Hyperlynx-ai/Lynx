# Handoff: where the work stands (2026-11-24)

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
- **AI:** a free Gemini key (env `GOOGLE_API_KEY`), test/synthetic data
  only (KL-05, policy AI-02). **Free tier = 20 requests per day per model**
  (KL-20).
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
- **Phase 2** (candidate onboarding, profile, CV and Lynx memory):
  - 2.1 AI foundation — done (PR #67).
  - 2.2 CV upload and parsing — done (PR #68).
  - 2.3 onboarding, profile answers, privacy choices — done (PR #69).
  - 2.4 "What Lynx knows about you", Tell Lynx more, download my data —
    done (PR #70). Verified on production after merge (version `a554a75`,
    migrations applied to staging and production).
  - **2.5 CV editor — unfinished**, branch `feat/p2-cv-editor` (pushed; no
    PR yet). See section 6.
  - **2.6 PDF/DOCX export — not started.** See section 6.
  - Then the Phase 2 "done when" check on production.
- **Phase 3 onwards:** not started. See `docs/roadmap.md` (Phase 3 = jobs
  engine and opportunities feed; then recruiters, AI interviews, recruiter
  search, Lynx assistant, emails, Academy migration, demo hardening).

## 6. What's left in Phase 2

### 2.5 CV editor (branch `feat/p2-cv-editor`)

Built and committed: `cv_edit` AI task + prompt + tests; `guardEdit`
(drops new jobs/schools/projects, keeps employers and dates, drops skills
not in the CV, flags numbers not in the CV) and `cleanCv` with tests; API
`POST /cvs/:id/ai-edit`, `POST /cvs/:id/tailor` (one section at a time),
`POST /cvs/:id/versions`, `PUT /me/candidate/matching-cv` (also refreshes
Lynx's CV facts); a newly parsed CV becomes the matching CV; web editor at
`/app/cv/[id]/edit` (section forms, "ask lynx" per section, Tailor to a
role, word diffs with Accept/Reject, Save as version N, versions list with
"Use for matching" and Open/restore); "Edit with Lynx" button on the CV
page; one retry after a provider rate limit; `services/ai/dev.py` (see
traps).

Verified in the local browser: editor loads; Ask Lynx on the summary gives
a correct diff; Accept + Save created version 2; Use for matching works;
Tailor produced summary and experience proposals. Skills failed because the
day's Gemini quota ran out.

To do:
1. **Model fallback chain (owner approval, protected area):** the free key
   allows 20 requests/day per model. Proposed for every task in
   `models.yaml`: `gemini-3.6-flash` → `gemini-3.7-flash` →
   `gemini-3.5-flash` → `gemini-3.5-flash-lite` (each has its own quota;
   probe models first: `gemini-3.8-flash` was overloaded,
   `gemini-flash-latest` timed out). Also: don't retry on a 429 whose
   `retryDelay` is hours (daily quota) — only on short per-minute limits.
   Update KL-20 with the "20/day per model" finding (already noted below).
2. Re-test Tailor end to end (all three sections) once quota is available;
   the experience section took ~80 s once — consider lowering Gemini
   thinking for `cv_edit` (`google_thinking_config`), measure first.
3. An eval for `cv_edit` (policy AI-04): synthetic instructions on the
   sample CVs; score that nothing is invented (guard warnings, unchanged
   employers/dates) and that the instruction was followed.
4. An e2e test for the editor (works without the AI: hand edit → Save →
   version 2 → Use for matching; "ask lynx" shows a clear error in CI).
5. Run all checks (below), update roadmap (2.5 In review), open the PR
   (protected: `models.yaml`; note KL-20).

### 2.6 Exports (`feat/p2-cv-export`)

Per ADR 0010 and the roadmap: three templates — an ATS-friendly classic
(based on "Jake's Resume" layout), modern, and compact — rendered in the
**browser** from `CvData`: PDF with `@react-pdf/renderer`, DOCX with
`docx`. Download buttons on the CV page and editor (for any version). Use
the built-in PDF fonts (Helvetica / Times) for now and log a KL item that
non-Latin scripts aren't supported in PDFs yet. Check licences and add to
`docs/third-party.md`. Test: unit tests that each template renders the
sample CV without errors; e2e that the download produces a PDF and a DOCX.

### Phase 2 "done when"

On production, a new candidate goes from CV upload to an AI-edited CV
downloaded as PDF and DOCX. After 2.5 and 2.6 merge, ask the owner to run
it (creating accounts on production needs the owner's OK), or get explicit
permission to use a synthetic test account.

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
  Fixed on `feat/p2-cv-editor` with `services/ai/dev.py` (restarts uvicorn
  by terminating it). Don't go back to `--reload`.
- **Gemini free tier:** 20 requests/day per model; parallel requests get
  429. Run AI calls one at a time; don't burn quota on repeated evals.
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
