# Handoff: where the work stands (2026-11-29)

Read this first if you are an agent (or a teammate) picking up the work. It
summarises the state of the project, what comes next, how we work, and the
traps we already fell into. Everything else lives in the repository:
`AGENTS.md` (rules for every agent), `docs/roadmap.md` (all phases and
chunks), `docs/known-limitations.md` (KL-01…KL-28), `docs/decisions/`
(ADRs 0001–0011), `docs/policies/`, `infra/README.md` (accounts, projects,
environment variables, workflows, Vercel quirks).

## 1. The product

**Hyperlynx** is a job platform with an AI agent called **Lynx**. Candidates
(mainly from India) look for jobs, internships and scholarships in the UAE,
Europe and 25+ other countries; recruiters find verified candidates. It
replaces the old "Hyperlynx Academy" site.

The owner's 12 requirements (all must be built before the demo; no deadline):

1. Sign-up / login with email and Google. *(done)*
2. Separate candidate and recruiter logins and flows. *(done)*
3. AI-ranked opportunity cards for candidates. *(done, Phase 3)*
4. A CV section: AI edits and format conversion (PDF / DOCX). *(done)*
5. Recruiter onboarding. *(Phase 4, next)*
6. AI-ranked candidate search for recruiters. *(Phase 6)*
7. External jobs (every free source, scraping included) plus affiliated
   jobs, shown with an "Affiliated" tag. *(external done; affiliated jobs
   come from recruiters in Phase 4)*
8. AI interviews (a main selling point): LiveKit, video; recruiters see
   results (and recordings if the candidate opts in); retake every 30 days;
   proctoring in v1. *(Phase 5)*
9. Job-specific interviews. *(Phases 4-5: the "Require Lynx interview"
   switch)*
10. Email job alerts every 2 days. *(Phase 8)*
11. A fully automatic, personalised weekly newsletter (Resend). *(Phase 8)*
12. A profile page showing what Lynx knows about the candidate. *(done)*

Other owner decisions: three services (Next.js web, Fastify API, Python AI
service); Supabase; a model-agnostic AI layer; recruiters see full candidate
profiles; Vercel hosting; GitHub Actions for scheduled work instead of
Inngest (ADR 0011).

## 2. How we work (owner's working agreement)

- **Build only what was asked.** Be proactive with questions, and always
  give a recommendation with them (the owner usually picks the recommended
  option; make it the first one). Before a phase, ask its open questions.
- **One feature branch per roadmap chunk** (`feat/p<phase>-<name>`), small
  logical commits, one PR to `main` per chunk. **Never push to `main`** (a
  git hook blocks it). Commit as `Sujaanb`. The owner merges PRs. When
  chunks depend on each other, stack the branches and say "merge #N first"
  in the PR. **Before pushing to a PR branch, check it isn't merged yet**
  (`gh pr list --state all`); pushing to a merged branch caused a broken PR
  once.
- PRs touching protected areas (`supabase/migrations`,
  `services/ai/config/models.yaml`, auth, `.github/workflows`) need the
  owner's review: list them under "Protected areas" in the PR.
- PR descriptions: what changed for users, how it works, protected areas,
  what the owner must do after merging (exact commands), known limitations
  added, what was checked. End with the Claude Code line. Commits end with
  a `Co-Authored-By:` line for the agent.
- **Log every limitation** you can't resolve now in
  `docs/known-limitations.md` (next free number: **KL-29**) in the same PR.
- Update `docs/roadmap.md` chunk status (In review / Done) in each PR.
- **Never edit a migration that was applied** (even locally merged ones):
  add a new one. `node scripts/check-migrations.mjs origin/main` checks it.
- Speed and demo first; reuse open source (check licences, note in
  `docs/third-party.md`); keep the structure simple.
- **Agent-agnostic:** skills and configs live in `.agents/`; run
  `node scripts/agents-sync.mjs` after editing them (CI checks the mirrors).
  Edit skills only in `.agents/skills/`, never in `.claude/skills/`.

## 3. Design: the `void-terminal-glass` skill, v2

Every UI change follows `.agents/skills/void-terminal-glass/SKILL.md` and its
references (`components.md`, `copy.md`, `motion.md`). Read it before writing
UI. v2 (2026-11-29, PR "design system v2") was rebuilt after studying
taste-skill, impeccable and Emil Kowalski's skills; the owner approved:

- **Headline + lede:** a one-colour white headline, then a separate 20px
  grey paragraph (`Headline` with `title` and `lede`). The old same-size
  two-tone "fused headline" is retired. No trailing full stops in titles.
- **Surfaces:** marketing (expressive), app (precise, no eyebrows, no
  texture), reading (Academy, help), email (Phase 8, light table layout).
- **Type scale:** 68 / 48 / 32 / 20 (`text-lede`, `text-heading`) / 16 /
  14 (`text-small`) / 13 mono. Monospace only for data (numbers, dates, IDs,
  code), never for sentences or "$" prompts.
- **Cards** (`Card`: `bg-surface`, hairline, 0 radius) for things you act
  on; **Badges** (`Badge`: square tints, tones accent / neutral / warning /
  error) for status; `Button` `ghostIcon` for icon actions; icons from
  `lucide-react`.
- Colours unchanged (black, mint `#34D59A` as a signal, red errors only,
  amber attention) plus tints and `border-strong`. Zero radius except pills.
- Motion: purposeful only; `ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`;
  buttons press to 0.97; linked cards lift 2px; reduced motion respected.
- Copy: plain, verb + object buttons, banned clichés ("where X meets Y",
  unlock, seamless…).
- **`pnpm design:lint`** (also inside `pnpm lint` for the web app) fails on
  raw hex colours, Tailwind's default palette, off-system radii and
  shadows, gradients, arbitrary font sizes, bold weights and all-caps.
- The three outside skills were studied and then removed; only
  `void-terminal-glass` remains.

## 4. Accounts and environments

- **GitHub:** org `Hyperlynx-ai`, repo `Lynx` (public, ADR 0009). Owner's
  account: `Sujaanb`. `gh` is logged in. Setting GitHub secrets from an
  agent is blocked: give the owner `gh secret set NAME --repo
  Hyperlynx-ai/Lynx` commands instead. Repository secrets set today:
  `CURATED_SHEET_ID`, `GOOGLE_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, `NVIDIA_API_KEY`, `REED_API_KEY`,
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_DB_PASSWORD`,
  `SUPABASE_STAGING_DB_PASSWORD`.
- **Vercel** (scope `sujaan-bhattacharyyas-projects`, Hobby plan, region
  `bom1`): projects `lynx-web`, `lynx-api`, `lynx-ai`.
  Production: https://lynx-web-pi.vercel.app, https://lynx-api-silk.vercel.app,
  https://lynx-ai-two.vercel.app. Every PR gets previews (they use the
  staging database, KL-08). **Do not touch the `hyperlynx-frontend` project
  or the hyperlynx.ai domain.** Optional and not confirmed: the
  `GITHUB_DISPATCH_TOKEN` in `lynx-api` that makes "Run now" and new
  matches start at once (else hourly; `infra/README.md`).
- **Supabase** (Mumbai): `lynx-staging` = `kwzwcoawnapdyddaiajk`,
  `lynx-prod` = `xwtgskwnoasqxcrqrkdt`. Migrations reach both through the
  `db-migrate.yml` workflow when a PR merges to `main`. Local stack in
  Docker (`pnpm db:start`). Free plan: 500 MB database (KL-06); jobs with
  embeddings take about 140 MB.
- **AI:** primary provider **NVIDIA NIM** (`NVIDIA_API_KEY`), chain MiniMax
  M3.1 Flash → GLM 5.3 Flash → Gemini (`GOOGLE_API_KEY`). Embeddings: NIM
  `nvidia/nemotron-3.5-embed-1b`, 768 dimensions. Test/synthetic data only
  (KL-05, policy AI-02). Free tiers: Gemini 20 requests/day per model
  (KL-20); NIM retires models (KL-21); NIM embeddings about 40 requests a
  minute.
- Secrets: real values only in git-ignored `.env.local` files and in
  Vercel / Supabase / GitHub settings. Never print or commit them.
- The owner runs an Anaconda `python -m http.server` on port 8000 — never
  kill it; that's why the AI service runs on **port 4500** locally.

## 5. Architecture (short)

- `apps/web` — Next.js 16 (App Router, `proxy.ts`), Tailwind v4 with the
  design tokens (`packages/ui/src/styles/theme.css`), `packages/ui`
  components. Browser talks only to the web app; `/api/*` is rewritten to
  `apps/api`. Server actions call the API with the user's token
  (`apiFetchAsUser`). Areas: public (`/`, `/recruiters`, auth), candidate
  (`/app`, `/app/opportunities`, `/app/profile`, `/app/cv`,
  `/app/settings`), recruiter (`/recruiter`, placeholder), admin (`/admin`
  users, `/admin/sources`, `/admin/companies`).
- `apps/api` — Fastify 5 + zod; OpenAPI → `packages/types`
  (`pnpm api:types` after route changes). Verifies Supabase JWTs. Candidate
  data is read/written **as the user** (row-level security applies); the
  secret key only for admin work and `ai_calls`. AI calls go through
  `aiClient.call(task, ...)` with per-user daily caps. Modules: health, me,
  admin, candidates, cvs, facts, export, sources (+ companies, dispatch),
  opportunities.
- `services/ai` — FastAPI + Pydantic AI. Tasks: `ping`, `cv_parse`,
  `facts_extract`, `cv_edit`, `job_rerank` (models in
  `config/models.yaml`, prompts in `prompts/`, evals in `evals/`).
  The **jobs engine** (`lynx_ai/jobs/`, ADR 0011) runs as a CLI in GitHub
  Actions, not on Vercel: `python -m lynx_ai.jobs run|embed|match|check`.
- **Jobs engine** (Phase 3): sources = the curated Google Sheet; free APIs
  (Arbeitnow, RemoteOK, Himalayas, Jobicy, Reed); company boards on
  Greenhouse, Lever, Ashby, SmartRecruiters and Recruitee (63 companies,
  Admin → Companies); scrapers via JobSpy (LinkedIn, Indeed, Glassdoor,
  Naukri; **off by default**, KL-27). Normalisation (country, city, remote,
  type, seniority, field), de-duplication, expiry (deadline passed or not
  seen for 7 days). Matching: embeddings + field / skills / seniority score
  + AI re-rank of the top 30 with a reason → top 100 in `job_matches`.
  `.github/workflows/jobs-ingest.yml`: daily 01:30 UTC (all sources, then
  embed, then match everyone), hourly (requested sources and candidates),
  manual dispatch.
- `packages/shared` — zod schemas and labels shared by web and API: `cv.ts`,
  `candidate.ts`, `facts.ts`, `cv-edit.ts`, `jobs.ts` (fields of work, job
  types, feed views, match labels), `policy.ts`.
- Database tables: `profiles`, `ai_calls`, `cvs`, `cv_versions`,
  `candidates`, `consents`, `lynx_facts`, `job_sources`, `job_runs`,
  `jobs` (with `embedding`), `ats_companies`, `candidate_match_state`,
  `job_matches`, `job_saves`; function `opportunity_feed(...)` (security
  invoker). pgTAP tests in `supabase/tests/database`.

## 6. Status

- **Phases 0–3: done** and merged (Phase 3 PRs #74–#81; the owner tested
  the feed on production).
- **Design system v2:** on branch `feat/design-system-v2` (PR open when you
  read this, or merged): skill v2, cards for opportunities, headline +
  lede everywhere, new hero copy, the "Academy is becoming Hyperlynx"
  banner and the footer status line removed, design lint.
- **Next: Phase 4 — recruiter onboarding, jobs and applications**
  (`docs/roadmap.md`): 4.1 recruiter onboarding (company, domain check,
  pending state, admin approval queue, invites), 4.2 job posting (AI help
  drafting, draft / published / closed, "Require Lynx interview"; published
  jobs enter the candidate feed as **Affiliated** with in-platform apply),
  4.3 applications (one-click apply with a chosen CV version, candidate
  tracker, recruiter pipeline new / shortlisted / rejected / hired,
  notifications). Done when: on production a recruiter is approved, posts a
  job, a candidate applies, and the recruiter moves the application through
  the pipeline.
- Questions to ask the owner before Phase 4 (with recommendations), at
  least: how a company is created and verified (email domain matches the
  website domain, plus admin approval: recommended); whether one person can
  belong to several companies (no, for now); what a job form needs
  (title, location, type, remote, salary range optional, description with
  AI draft, deadline, "Require Lynx interview"); how affiliated jobs enter
  the feed (a `hyperlynx` source in `jobs` with `is_affiliated`, ranked
  like the rest but marked: recommended); what "notifications" means before
  Phase 8's emails (in-app only for now: recommended); and pipeline view
  (stage columns with a table/list toggle).

## 7. Evals (policy AI-04)

Every AI task has an eval in `services/ai/evals/` (synthetic data); results
are committed in `evals/results/`. Current: cv_parse 1.0, facts_extract
0.979, cv_edit 1.0, job_rerank 1.0. Run one after any prompt or model change
and commit the result; quotas are small, so run them one at a time. A new AI
task (for example Phase 4's job-description drafting) needs its prompt file,
a `models.yaml` entry (protected area) and an eval.

## 8. Commands

| What | Command |
|---|---|
| Install | `pnpm install` (Python: `uv sync` in `services/ai`; scrapers: `uv sync --group scrapers`) |
| Run everything (web 3000, api 4000, ai 4500) | `pnpm dev` |
| Local database | `pnpm db:start`, then `pnpm db:env` (writes `.env.local` keys) |
| Apply new migrations locally | `pnpm supabase migration up --local` |
| Database tests | `pnpm db:test` |
| All JS checks | `pnpm check` (or `pnpm turbo run lint typecheck test build`) |
| Design lint | `pnpm design:lint` |
| AI service checks | in `services/ai`: `uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest -q` |
| Browser tests | `pnpm e2e` (or `pnpm --filter web exec playwright test`) |
| AI evals (real model, uses quota) | in `services/ai`: `uv run python -m evals.<task>` |
| Jobs locally | in `services/ai`: `uv run python -m lynx_ai.jobs run --source greenhouse`, `... embed`, `... match --all` |
| After API route changes | `pnpm api:types` |
| After editing a shared file the API uses | `pnpm shared:sync` |
| After editing `.agents/` | `node scripts/agents-sync.mjs` |
| Migration rules | `node scripts/check-migrations.mjs origin/main` |
| Make someone admin | `pnpm admin:set-role <email> admin [--env staging\|production --yes]` |

Local synthetic accounts (password = `PASSWORD` in
`apps/web/e2e/helpers.ts`): `match-demo-1@example.test` (candidate: data
analyst, AE/DE/GB, parsed CV, 100 matches) and the e2e admins
(`e2e-boards-…@example.test`). Local data: about 12,000 company-board jobs
with embeddings.

## 9. Traps we already hit (read these)

- **KL-19: the deployed API can't import workspace TypeScript packages.**
  Never import `@lynx/shared` in `apps/api`. Add the file to `FILES` in
  `scripts/shared-sync.mjs`, run `pnpm shared:sync`, import from
  `apps/api/src/shared/`. CI checks the copies.
- **KL-15: Vercel compiles the API with strict mode off.** `pnpm typecheck`
  runs an extra non-strict check.
- **Never edit an applied migration** (PR #77 broke CI that way): add a new
  migration. New migrations are applied by `db-migrate.yml` on merge.
- **The local dev servers:** `uvicorn --reload` on Windows kills Turborepo;
  `services/ai/dev.py` replaces it. If a Next.js page or layout doesn't
  pick up an edit, restart the dev server (it happened with a layout).
- **Docker Desktop** may not be running after a restart: start
  `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`, wait, then
  `pnpm db:start` (run it again if the first try says the database is not
  ready).
- **Windows shell:** long heredocs with quotes can be cut off; write
  scripts or files with the editor tool, then run them. Regex escapes in
  Python strings passed through bash get mangled (`\b`): put the script in
  a file. `rm -rf "$VAR/…"` is refused by a safety check: use
  `"${VAR:?}/…"`.
- **AI free tiers:** keep AI calls sequential, keep the fallback chain, set
  `timeout_s` per task. NIM embeddings occasionally return 422 for a batch:
  `embed.py` retries, then embeds job by job.
- **GitHub schedules** start late on a new workflow and can be delayed;
  "Run now" without `GITHUB_DISPATCH_TOKEN` waits for the hourly run.
- **Public workflow logs:** the jobs CLI prints counts only. Never log
  candidate data or keys there.
- **e2e without AI:** seed with `seedParsedCv()` and `seedMatchedJob()`
  (apps/web/e2e/helpers.ts); CI has no AI service and an empty jobs table.
- Vercel: the API entry must stay `apps/api/src/server.ts`; new build-time
  env vars go into `turbo.json`.
- New API env vars: add to `apps/api/src/env.ts`, `.env.example`,
  `scripts/local-env.mjs` (if local), Vercel (production = prod project,
  preview = staging), and `infra/README.md`.
- Next.js prints a hidden `role="alert"` route announcer: in Playwright,
  match alerts by text (`expectAlert`).
- New candidates are redirected from `/app` to `/app/onboarding` until
  onboarding is complete; e2e tests use `onboardedCandidate()`.
- Pages with an AI call take 15–60 s; show a `LoadingState`.
