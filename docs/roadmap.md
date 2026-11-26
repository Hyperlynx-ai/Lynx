# Lynx roadmap

> **Status: APPROVED by the owner on 2026-11-22.**
> Agents and teammates: only start a phase that the status table below marks
> `Approved` or `In progress`, and only chunks whose dependencies are done.

This file is the single source of truth for what we are building and in what
order. Any agent (Claude Code, Codex, opencode, Gemini CLI, Cursor, and so on)
or teammate should be able to read it and pick up the next piece of work.

## How to use this file

- Work is split into **phases**, and each phase into **chunks**. One chunk is
  one feature branch and one pull request to `main`.
- Branch names follow `<type>/p<phase>-<short-name>`, for example
  `feat/p1-auth-candidate`. Types: `feat`, `fix`, `chore`, `docs`, `ci`, `test`.
- Commit often with conventional messages (`feat: ...`, `fix: ...`,
  `docs: ...`). Never commit to `main`; `main` is what gets deployed.
- When a chunk's PR is merged, update its status in the table in the same PR.
- Detailed reasons for each decision go in `docs/decisions/` (ADRs, created in
  Phase 0). This file only summarizes them.

## Product in one paragraph

**Hyperlynx** (the company and the domain) runs a job platform where
candidates find opportunities and recruiters find candidates. **Lynx** is the
AI agent that does the work for users: it ranks jobs, edits CVs, interviews
candidates over voice and video, and remembers what it learns about each
candidate. Candidates are mostly students and professionals in India looking
for work, internships and study in the UAE, Europe and 25+ other countries.
The platform replaces the old Hyperlynx Academy website, including its paid
programmes. The design language is the `void-terminal-glass` skill.

## Owner decisions (2026-11-22)

| Topic | Decision |
|---|---|
| Demo | For business contacts of the owner's superior. No deadline. Build everything below before showing it. |
| Academy site | Lynx replaces it entirely: programmes, Razorpay payments, Topmate links, contact. |
| Markets | Candidates mostly in India; jobs in the UAE, Europe and 25+ countries. |
| Brand | Company and site: Hyperlynx. AI agent: Lynx. Reuse the old logo. Domain comes later; use the Vercel URL until then. |
| Architecture | Three services: Next.js web app, separate TypeScript API, Python AI service (plus a Python interview agent). |
| Data, login, files | Supabase: Postgres, Auth (email and Google), Storage, pgvector. Managed with the Supabase CLI. |
| AI layer | A Python equivalent of the Vercel AI SDK that can reach any model, including Chinese and obscure ones (see "AI layer"). Start with the Gemini key from the prototype. |
| AI interviews | LiveKit Agents with voice **and video**. Recruiters see score, strengths, gaps and transcript if the candidate opts in, and the video recording if the candidate also opts in to that. Verification interview retake every 30 days; practice interviews unlimited with a daily cap. Proctoring is in the first version. |
| Job-specific interviews | Practice interview for any job. For affiliated jobs, the recruiter chooses per job whether the interview is required to apply. |
| Accounts and flows | Proposed candidate and recruiter flows approved. One role per account. |
| Recruiter onboarding | Self-serve sign-up with work email, automatic email-domain check, manual approval by the Hyperlynx team. |
| Affiliated | Every approved recruiter is affiliated (stored as a flag so it can become a paid tier later). |
| Candidate visibility | Approved recruiters see full candidate profiles, including contact details. |
| Applying | One-click apply on Lynx for affiliated jobs; recruiters get a simple pipeline. |
| Job sources | Every free source available, **including scraping** of sites such as LinkedIn, Indeed, Bayt and Naukri. |
| CV | Stored as structured data, 3 templates, PDF and DOCX export, AI edits shown as a before/after diff. |
| Lynx placement | Floating "Ask Lynx" chat on every candidate page, plus a "What Lynx knows about you" page. |
| Job alerts | Every 2 days, for everyone subscribed. |
| Newsletter | Weekly, fully automatic, personalized per candidate. |
| Email | Resend + React Email. |
| Hosting | Vercel + Supabase + LiveKit Cloud + Resend. |
| Merging | Agents may merge a PR when CI passes and no protected area is touched. The owner merges protected-area PRs. |
| Team | Owner plus 2 to 3 teammates, on Windows and macOS. Everything must work on both. |
| Policies | The owner delegated the policy details; they follow the recommended answers from the planning chat, adjusted to the decisions above. |

## Architecture

```
                       ┌────────────────────────────┐
   Browser ───────────►│ apps/web  (Next.js, Vercel)│
      │                └──────────────┬─────────────┘
      │                      /api/* rewrite
      │                ┌──────────────▼─────────────┐      ┌──────────────────────────┐
      │                │ apps/api (Fastify, Vercel) │─────►│ services/ai (FastAPI,    │
      │                │ business rules, permissions│      │ Vercel, internal only)   │
      │                └──┬──────────┬──────────┬───┘      │ AI tasks, ingestion,     │
      │                   │          │          │          │ embeddings, newsletters  │
      │          Resend, Razorpay,   │     Inngest jobs ──►└────────────┬─────────────┘
      │          LiveKit tokens      │                                  │
      │                   ┌──────────▼──────────────────────────────────▼──┐
      │                   │ Supabase: Postgres + pgvector, Auth, Storage    │
      │                   └─────────────────────────────────────────────────┘
      │
      └──── voice/video ──► LiveKit Cloud ◄──► services/interview-agent (Python)
```

**Rules that keep this simple:**

1. The browser talks to `apps/api` (through the web app's `/api/*` rewrite, so
   there is one origin and no CORS), to Supabase Auth, to Supabase Storage via
   short-lived signed URLs, and to LiveKit with tokens minted by `apps/api`.
   The browser never calls `services/ai` directly.
2. `apps/api` is the only place that decides who may do what. It verifies the
   Supabase login token on every request.
3. `services/ai` holds AI work and batch jobs (ingestion, embeddings,
   newsletters). `apps/api` calls it with a service token.
4. The database schema changes only through SQL migrations in
   `supabase/migrations/`, forward-only, applied with the Supabase CLI. Both
   TypeScript and Python read the same tables.
5. Contracts are generated, not hand-copied: `apps/api` and `services/ai`
   publish OpenAPI specs, and typed clients are generated into
   `packages/types`.
6. Environments: **local** (Supabase in Docker), **preview** (one per PR on
   Vercel, using the staging Supabase project), **production** (`main`, using
   the production Supabase project).

### Target repository layout

```
apps/
  web/                 Next.js (App Router): public site, candidate app,
                       recruiter app, admin console (/admin)
  api/                 Fastify + zod + OpenAPI: business logic, permissions,
                       emails, payments, LiveKit tokens, webhooks
services/
  ai/                  Python (uv, FastAPI, Pydantic AI, LiteLLM): AI tasks,
                       job ingestion, matching, newsletters
  interview-agent/     Python LiveKit Agents worker (deployed to LiveKit Cloud)
packages/
  ui/                  design tokens + components (shadcn/ui, re-themed)
  emails/              React Email templates
  db/                  Drizzle schema (pulled from the database) + client
  types/               generated API clients and shared types
  config/              shared TypeScript, lint and format config
supabase/              config.toml, migrations/, seed.sql
evals/                 AI evaluation datasets and scripts
infra/                 deployment notes and config (Vercel, LiveKit, Inngest)
docs/                  roadmap, decisions, policies, playbooks, third-party log
.agents/skills/        shared agent skills (canonical copy), e.g. the design skill
references/            git-ignored clones of other repos and the old prototype
```

`apps/admin` is removed: the admin console lives inside `apps/web` under
`/admin`, behind the admin role. One app to deploy instead of two.

### Tooling

- **JavaScript/TypeScript:** pnpm (via corepack) workspaces + Turborepo,
  strict TypeScript, ESLint + Prettier, Vitest, Playwright.
- **Python:** uv, Ruff, Pyright, pytest.
- **UI:** Tailwind + shadcn/ui components (copied in as source), re-themed to
  the design skill's tokens. Every UI change follows `void-terminal-glass`.
- **Database:** Supabase CLI for migrations and config; Drizzle ORM in
  TypeScript (schema pulled from the database after each migration);
  SQLAlchemy Core + psycopg in Python.
- **Background jobs:** Inngest (has both TypeScript and Python SDKs, runs
  long work as small retryable steps that fit Vercel's time limits).
- **Local guards:** lefthook git hooks (block commits to `main`, format, scan
  for secrets with gitleaks). Cross-platform; no bash-only scripts.
- **CLIs:** Vercel CLI and Supabase CLI are installed as dev dependencies so
  everyone runs the same version with `pnpm vercel ...` and
  `pnpm supabase ...`. The LiveKit CLI (`lk`) is installed per OS.

### AI layer

The Python equivalent of the Vercel AI SDK is **Pydantic AI** (agents, tools,
structured output, streaming, fallbacks), with **LiteLLM** behind it for the
long tail of providers.

- `services/ai/config/models.yaml` maps each **task** to a model plus
  fallbacks:

  ```yaml
  tasks:
    cv_parse:      { model: "google:gemini-3.8-flash", fallbacks: ["google:gemini-3.6-flash"] }
    job_rerank:    { model: "google:gemini-3.8-flash" }
    lynx_chat:     { model: "google:gemini-3.8-flash" }
    embeddings:    { model: "google:gemini-embedding-2" }
  ```

  Changing a model means editing this file (or setting an environment
  override such as `LYNX_MODEL_LYNX_CHAT`) and adding that provider's API key.
- Reachable models: providers Pydantic AI supports natively (Google, OpenAI,
  Anthropic, Mistral, Groq, DeepSeek, OpenRouter, Alibaba/Qwen and others),
  **any OpenAI-compatible endpoint** (base URL + key), and LiteLLM's 100+
  providers. Together that covers Chinese providers (DeepSeek, Qwen, Kimi, GLM
  and others), aggregators such as OpenRouter, and self-hosted models.
- The interview agent uses LiveKit's own model plugins: realtime models
  (Gemini Live, OpenAI Realtime) for voice with video understanding, or a
  pipeline of any speech-to-text + any LLM + any text-to-speech.
- Every AI call is logged to an `ai_calls` table (task, model, tokens,
  latency, estimated cost, error), never with raw personal data.
- Each AI task gets an evaluation set in `evals/` before it ships.
- Cost guards: per-user daily caps (practice interviews, chat messages, CV
  rewrites) and provider spending limits.

**Starting models** (the prototype's key lists these as available):
`gemini-3.8-flash` for most tasks, `gemini-embedding-2` for embeddings, and
`gemini-3.8-live` for interviews (to be checked against LiveKit's Gemini
plugin; a native-audio model is the fallback).

### Data model (first cut)

Every table has row-level security. Main tables:

- **Accounts:** `profiles` (user, role: candidate, recruiter or admin),
  `consents` (what each user agreed to, and when).
- **Candidates:** `candidates`, `candidate_preferences`, `cvs`,
  `cv_versions`, `lynx_facts` (fact, category, source, confidence).
- **Recruiters:** `companies`, `recruiters` (status: pending, approved,
  rejected; affiliated flag), `company_invites`,
  `recruiter_profile_views` (audit log).
- **Jobs:** `jobs` (source, external id, affiliated, type: job, internship or
  scholarship), `job_sources`, `job_source_runs`, `embeddings`,
  `job_matches` (candidate, job, score, reason, computed at), `saved_jobs`.
- **Applications:** `applications`, `application_events`.
- **Interviews:** `interviews` (kind: verification, practice or job; track;
  score; scorecard; transcript; recording path; sharing flags),
  `interview_events` (proctoring).
- **Email:** `email_preferences`, `email_log`, `newsletters`.
- **Academy:** `programmes`, `enrolments`, `payments`, `contact_messages`.
- **Operations:** `ai_calls`.

## Status

| Phase | Name | Depends on | Status |
|---|---|---|---|
| 0 | Foundations and production pipeline | none | Done |
| 1 | Accounts, roles and app shells | 0 | Done (merge #60 to #64) |
| 2 | Candidate onboarding, profile, CV and Lynx memory | 1 | Approved |
| 3 | Jobs engine and opportunities feed | 1 | Approved |
| 4 | Recruiter onboarding, jobs and applications | 1, 3 | Approved |
| 5 | AI interviews (voice, video, proctoring) | 2, 4 | Approved |
| 6 | Recruiter candidate search | 4, 5 | Approved |
| 7 | Lynx assistant | 2, 3 | Approved |
| 8 | Emails: job alerts and newsletter | 3 | Approved |
| 9 | Hyperlynx Academy migration | 1 | Approved |
| 10 | Demo readiness and hardening | all | Approved |

After Phase 1, teammates can work in parallel on phases whose dependencies
are done (for example 2, 3 and 9 at the same time), as long as two people
never edit the same files. Claim a chunk by assigning yourself its GitHub
issue before starting.

Every phase ships to production as its chunks merge. The demo happens after
Phase 10.

---

## Phase 0: Foundations and production pipeline

**Goal:** any teammate or agent can clone the repo on Windows or macOS, set
it up, and run it; skeleton versions of all services are live in production
on `*.vercel.app`; every PR is checked automatically.

| Chunk | Branch | What | Status |
|---|---|---|---|
| 0.1 | `docs/roadmap` | This roadmap (the PR for approval). | Done (#1) |
| 0.2 | `chore/p0-agent-rules` | Fill in root `AGENTS.md` (non-negotiable rules), policies 01 to 08, teammate playbooks, ADRs for the decisions above. `CODEOWNERS` set to `@Sujaanb`. Pointer files for tools that don't read `AGENTS.md` (`CLAUDE.md`, `GEMINI.md`). Design skill copied to `.agents/skills/void-terminal-glass/`, mirrored into each tool's skill folder by `node scripts/agents-sync.mjs` (CI checks the copies match in 0.4). One shared MCP server list and guardrails, generated into each tool's config format. LF line endings. | Done |
| 0.3 | `chore/p0-monorepo` | pnpm + Turborepo. `apps/web` (Next.js + Tailwind + shadcn/ui on the design tokens, placeholder home page in the design language with the old logo). `apps/api` (Fastify, zod, OpenAPI, `/health`). `services/ai` (FastAPI, uv, Pydantic AI, model registry, `/health`, one test AI endpoint). `packages/ui`, `types`, `config`. Per-app `AGENTS.md` with real commands. Remove `apps/admin`. lefthook hooks, `pnpm setup:check` environment check, `pnpm dev` starts everything. | Done |
| 0.4 | `ci/p0-github-actions` | Path-filtered workflows: web and api (lint, type check, test, build), ai (ruff, pyright, pytest), secret scan, skills-sync check, check that applied migrations are never edited. Cached, to stay inside the free 2,000 Actions minutes per month. Also: PR labels by area plus `protected-area`, Dependabot, critical-vulnerability audit. | Done |
| 0.5 | `chore/p0-supabase` | Supabase CLI as a dev dependency (`pnpm db:*` scripts), local stack in Docker, `lynx-staging` and `lynx-prod` projects in Mumbai (`ap-south-1`). First migrations: `profiles` with roles (set at sign-up, never self-promoted to admin), RLS, pgvector; storage buckets (`cvs`, `interview-recordings`, `proctoring-snapshots`: private; `company-logos`: public; no profile photos per PRIV-04). pgTAP tests. Auth settings and Google sign-in in `supabase/config.toml` (secrets via `env()`). `db-migrate` workflow pushes migrations and config to staging, then production, after merge. Drizzle schema pull into `packages/db`; Python database module. | Done |
| 0.6 | `chore/p0-vercel` | Three Vercel projects (`lynx-web`, `lynx-api`, `lynx-ai`) created and linked with the CLI, each with its root directory. Environment variables set with `vercel env`. Web-to-API rewrite, API-to-AI service token. Previews use staging Supabase; production uses production Supabase. Unchanged apps skip builds. Production deploys from `main`. Smoke-test script. | Done (#6): production at https://lynx-web-pi.vercel.app |
| 0.7 | `chore/p0-tracking` | A GitHub milestone per phase and an issue per chunk, with labels for phase, area and protected areas, so teammates can claim work. Generated by `scripts/roadmap-issues.py` (re-run after adding chunks). | Done (#8) |

**Done when:** the three production URLs respond, CI is green on `main`, and
a fresh clone runs `pnpm setup:check` and `pnpm dev` on both Windows and macOS.

## Phase 1: Accounts, roles and app shells

**Goal:** candidates and recruiters can sign up and log in on production.

| Chunk | Branch | What | Status |
|---|---|---|---|
| 1.1 | `feat/p1-auth-candidate` | `/signup` and `/login`: email + password and Google. Forgot and reset password. Email verification (switched on once the domain and email sending are ready). Sessions via `@supabase/ssr`; token verification in `apps/api`; role saved at sign-up. Candidate area shell with role guard; account settings (change password, delete account). | Done (Google sign-in to verify on the preview) |
| 1.2 | `feat/p1-auth-recruiter` | `/recruiters` landing, `/recruiters/signup`, `/recruiters/login`. Free email domains (gmail.com and similar) rejected for recruiters; Google Workspace accounts allowed. One role per account, enforced in the database, with a clear message when someone uses the wrong login page. | Done (Google sign-up to verify on the preview) |
| 1.3 | `feat/p1-app-shells` | Design-system components in `packages/ui` (input, field, notice, panel, empty and loading states; navbar, footer). Layouts: public (header with login/sign-up, footer with link columns), signed-in app shell, auth page layout, 404 and error pages. Account settings moved to 1.1 (they need login). | Done (built first: the auth pages need its components) |
| 1.4 | `feat/p1-admin-basics` | Admin role granted by a script (`pnpm admin:set-role`, owner's Supabase login for hosted databases); admin-only `GET /admin/users`; `/admin` user list. | Done |
| 1.5 | `test/p1-e2e-auth` | Playwright tests: sign up, log in, log out, weak password, signed-out redirect, delete account, work-email rule, one role per account. CI job against a local Supabase stack; `pnpm db:env` writes local env files. | Done |

**Done when:** both roles can sign up with Google on production, and email
sign-up works (without the confirmation email until the domain is ready).

## Phase 2: Candidate onboarding, profile, CV and Lynx memory

**Goal:** a candidate uploads a CV, Lynx builds their profile, and they can
edit and download their CV.

| Chunk | Branch | What | Status |
|---|---|---|---|
| 2.1 | `feat/p2-ai-foundation` | Model registry with fallbacks and any OpenAI-compatible provider, `ai_calls` logging, per-user daily caps, admin AI check. Design in [ADR 0010](decisions/0010-candidate-data-and-ai-pipeline.md). The eval harness moved to 2.2, with the first task worth measuring. | Done |
| 2.2 | `feat/p2-cv-parse` | Upload PDF or DOCX to the private `cvs` bucket. `services/ai` turns it into structured CV data (the model reads the file; plain-text extraction as fallback). Eval harness in `evals/` with synthetic CVs (never real people's data) and a parsing-accuracy eval. | Done |
| 2.3 | `feat/p2-onboarding` | Three steps: (1) upload CV; (2) confirm profile: target roles, countries of interest, experience level, education, work authorization or visa status, pathway (internship, job switch, first job, higher education), phone or WhatsApp; (3) consent that approved recruiters can see the profile including contact details (can be hidden later), job alerts every 2 days, weekly newsletter. | Done |
| 2.4 | `feat/p2-lynx-memory` | Profile page and "What Lynx knows about you": every fact with its source (CV, interview, chat, or the candidate), editable and deletable. "Tell Lynx more" box that turns free text into facts. Download my data. | Done |
| 2.5 | `feat/p2-cv-editor` | Structured editor. AI edits from an instruction, shown as a before/after diff accepted or rejected per section. Tailor to a target role. Version history. Choose which version is used for matching. | In review |
| 2.6 | `feat/p2-cv-export` | Three templates: an ATS-friendly classic (based on the prototype's "Jake's Resume" layout), modern, and compact. PDF and DOCX export. Templates may be adapted from an open-source resume builder after a license check. | In review |

**Done when:** on production, a new candidate goes from CV upload to an
AI-edited CV downloaded as PDF and DOCX.

## Phase 3: Jobs engine and opportunities feed

Design: [ADR 0011](decisions/0011-jobs-engine.md).

**Goal:** the opportunities page shows a large, fresh, AI-ranked set of jobs,
internships and scholarships from many sources.

| Chunk | Branch | What | Status |
|---|---|---|---|
| 3.1 | `feat/p3-jobs-schema` | Jobs, sources and run tables. Normalization (title, company, country, type, remote, seniority, field of work), de-duplication across sources, expiry. Admin page listing sources with on/off switches, "run now" and health. | Done |
| 3.2 | `feat/p3-scheduler` | GitHub Actions workflows (ADR 0011, replacing Inngest): daily ingestion of enabled sources, hourly "run now" requests, run logs. | Done |
| 3.3 | `feat/p3-source-curated` | Import the team's Google Sheet (Opportunities and Jobs tabs). Admin screens to manage curated listings, replacing the sheet. | Done |
| 3.4 | `feat/p3-sources-free-apis` | Free public APIs, each checked for terms and attribution before it is switched on: Arbeitnow, RemoteOK, Himalayas, Jobicy, and Reed (key). Dropped after the terms check: Remotive, The Muse, Careerjet; Adzuna and Jooble (no keys, owner). | Done |
| 3.5 | `feat/p3-sources-ats` | Public company job boards on Greenhouse, Lever, Ashby, SmartRecruiters and Recruitee (Workable dropped: no public boards found), from an admin-managed company list (Admin -> Companies) seeded with 63 employers hiring in the UAE, Europe and India. "Run now" starts the workflow at once. | In review |
| 3.6 | `feat/p3-sources-scrapers` | JobSpy (MIT) for LinkedIn, Indeed, Glassdoor and Naukri, each its own source, off until the owner switches it on (KL-27): public search pages only, no logged-in scraping, 30 rotating searches a run. Left out after testing: Google Jobs, Bayt, ZipRecruiter. If GitHub's IPs get blocked, move scrapers to a small always-on worker (decided at that point). | In review |
| 3.7 | `feat/p3-matching` | Embeddings for jobs and candidates (NVIDIA nemotron-3.5-embed-1b, `halfvec(768)` in pgvector). Score = similarity + the prototype's field, skills and seniority signals, then the AI re-ranks the top 30 with a one-line "why it fits" (eval `job_rerank`: 1.0). Top 100 cached in `job_matches`; recomputed after the daily ingestion and within minutes when the profile changes. | In review |
| 3.8 | `feat/p3-opportunities-feed` | `/app/opportunities`: Jobs, Internships and Scholarships tabs; cards with title, company, place, type, posted date, match label and Lynx's reason, source credit, **Affiliated** tag, "Apply on source"; search, country, field, remote and saved filters; save and hide. Ranked matches first, then the newest jobs in the candidate's countries. Home tile with the top match. | In review |

**Done when:** the production feed shows ranked opportunities from at least
10 sources, refreshed daily.

## Phase 4: Recruiter onboarding, jobs and applications

**Goal:** an approved recruiter posts a job and manages applicants.

| Chunk | Branch | What |
|---|---|---|
| 4.1 | `feat/p4-recruiter-onboarding` | Create or join a company. Automatic check that the email domain matches the company website. Pending state (can draft jobs, cannot see candidates). Admin approval queue; approval makes the recruiter affiliated. Company admin invites colleagues. |
| 4.2 | `feat/p4-job-posting` | Job form with AI help to draft the description. Draft, published, closed. "Require Lynx interview" switch. Published jobs enter the candidate feed with the Affiliated tag and in-platform apply. |
| 4.3 | `feat/p4-applications` | One-click apply (profile, chosen CV version, interview if required). Candidate's application tracker. Recruiter pipeline per job: new, shortlisted, rejected, hired. Notifications on status changes. |

**Done when:** on production, a recruiter is approved, posts a job, a
candidate applies, and the recruiter moves the application through the
pipeline.

## Phase 5: AI interviews (voice, video, proctoring)

**Goal:** Lynx interviews candidates over voice and video and produces a
trustworthy scorecard. This is the main selling point.

| Chunk | Branch | What |
|---|---|---|
| 5.1 | `feat/p5-livekit-setup` | LiveKit Cloud project. `services/interview-agent` (Python, LiveKit Agents) with Gemini Live taking audio and the candidate's camera video. `apps/api` mints room tokens. Deployed with `lk agent deploy`, automated on `main`. |
| 5.2 | `feat/p5-interview-room` | Interview screen built from LiveKit's open-source React components, restyled to the design skill. Device check; camera check for lighting, blur and framing (ideas from the prototype); consent screen (recording, proctoring); live captions; end screen. |
| 5.3 | `feat/p5-interview-brain` | Interview plans per track (behavioral, technical, global fit, career coach) and field of work, adaptive difficulty (from the prototype), grounded in the CV and profile. Two swappable modes: realtime (Gemini Live or OpenAI Realtime, which can see the video) and pipeline (any speech-to-text + any LLM + any text-to-speech, with video frames sampled for vision). |
| 5.4 | `feat/p5-scorecard` | Transcript evaluated in `services/ai`: rubric scores, strengths, gaps, overall score, quotes as evidence. "Lynx Verified" badge rules. Verification retake every 30 days; practice unlimited with a daily cap. Evals. |
| 5.5 | `feat/p5-recording` | With consent, LiveKit Egress records the interview into Supabase Storage (S3-compatible, private). Playback through signed URLs. Retention period. |
| 5.6 | `feat/p5-proctoring` | In the browser with MediaPipe: no face, more than one face, looking away, phone in view. Tab switches, leaving full screen, covered camera. Time-stamped events with snapshots, an integrity summary on the scorecard, and an admin review queue. |
| 5.7 | `feat/p5-job-interviews` | Job-specific interviews generated from the job description and the CV. Practice for any job; required for affiliated jobs when the recruiter switched it on; results attached to the application. |
| 5.8 | `feat/p5-avatar` (optional) | An AI interviewer with a video face (Anam or Tavus) behind a switch. Needs a paid key. |

**Done when:** on production, a candidate completes a video interview and
gets a scorecard, and a recruiter sees the results the candidate chose to
share.

## Phase 6: Recruiter candidate search

**Goal:** recruiters find and rank candidates with AI.

| Chunk | Branch | What |
|---|---|---|
| 6.1 | `feat/p6-candidate-index` | Embeddings and searchable fields for candidates who are visible to recruiters. |
| 6.2 | `feat/p6-search` | Plain-language search ("React developers in Dubai with 3+ years") turned into filters + similarity, then re-ranked by an LLM with reasons. Filters: country, level, skills, verified only, score range. "Top candidates" for each of the recruiter's jobs. |
| 6.3 | `feat/p6-candidate-profile` | Full profile with contact details, CV download, interview results, Verified badge. Shortlists. Every profile view logged; a daily view quota per recruiter to stop bulk copying of candidate data. |

**Done when:** a recruiter searches, sees ranked candidates with reasons and
badges, and opens full profiles.

## Phase 7: Lynx assistant

**Goal:** Lynx is available everywhere a candidate is, answers with real
data, and keeps its memory up to date.

| Chunk | Branch | What |
|---|---|---|
| 7.1 | `feat/p7-lynx-chat` | Floating "Ask Lynx" on every candidate page, streaming replies, history. Persona and rules adapted from the prototype (answer what was asked, one question at a time when unclear, never invent jobs, salaries or visa rules). |
| 7.2 | `feat/p7-lynx-tools` | Tools: search and explain jobs, open a CV edit as a diff, add or change facts (after asking), start a practice interview, recommend a programme, explain the platform. Facts learned in chat are saved with source "chat". |
| 7.3 | `test/p7-lynx-evals` | Evals for factual grounding and tone. |

**Done when:** Lynx answers questions with the candidate's real jobs, CV and
facts, and its memory page reflects what it learned.

## Phase 8: Emails: job alerts and newsletter

**Goal:** candidates hear about new opportunities without logging in.

| Chunk | Branch | What |
|---|---|---|
| 8.1 | `feat/p8-email-infra` | Resend + React Email templates in the design language (`packages/emails`). Unsubscribe links and preferences page. Send log. Supabase auth emails sent through Resend once the domain is verified. |
| 8.2 | `feat/p8-job-alerts` | Every 2 days: new top matches since the last alert; skipped when there is nothing new. Sent in batches through Inngest. |
| 8.3 | `feat/p8-newsletter` | Weekly newsletter written by AI for each candidate: their best new jobs, CV and interview tips based on their gaps, and platform news. Sent automatically; an admin page shows samples and the send log. Evals. |

**Done when:** alerts and newsletters go out on schedule. Until the domain is
verified, they can only be delivered to the owner's own address.

## Phase 9: Hyperlynx Academy migration

**Goal:** everything the old Academy site did now lives on Hyperlynx.

| Chunk | Branch | What |
|---|---|---|
| 9.1 | `feat/p9-public-site` | Public pages from the prototype's content in the new design: home (hero, countries, who it's for, stories), about and founder, recruiter landing, contact form (saved and emailed), privacy policy, terms, cookie notice, basic SEO. |
| 9.2 | `feat/p9-programmes` | The four programmes (Dubai Handholding, Dubai Career Launchpad Essentials and Accelerator, Europe Launchpad) with detail pages and INR fees; Topmate booking links. |
| 9.3 | `feat/p9-payments` | Razorpay checkout, verified webhooks, enrolment records, receipts, admin enrolments view. Protected area. |

**Done when:** a visitor can read about Hyperlynx, enrol in a programme and
pay in Razorpay test mode.

## Phase 10: Demo readiness and hardening

**Goal:** the platform is safe, fast and ready to show.

| Chunk | Branch | What |
|---|---|---|
| 10.1 | `feat/p10-admin-console` | Admin dashboards: users, recruiter approvals, job sources health, flagged interviews, emails, payments, AI usage and cost. |
| 10.2 | `chore/p10-demo-data` | Realistic demo accounts, jobs, interviews and applications, plus a walkthrough script for the meeting. |
| 10.3 | `test/p10-quality` | End-to-end tests for every key flow, accessibility checks (WCAG AA), performance, error tracking. |
| 10.4 | `chore/p10-security-privacy` | Row-level security audit, rate limits, secrets review, data export and deletion, retention jobs for recordings and snapshots, consent records. Move to a paid AI key and retire the prototype's key. |
| 10.5 | `chore/p10-launch-checklist` | Paid plans where needed, domain and email verified, Google consent screen published, backups, uptime monitoring. |

---

## Standards for every chunk

- **Definition of done:** CI green; the Vercel preview works; tests for new
  logic; evals for AI changes; `AGENTS.md` files updated if commands or
  conventions changed; `docs/third-party.md` updated for reused code; UI
  passes the design skill's checklist; this roadmap's status updated.
- **Reuse first:** look for an open-source component or library with a
  permissive license (MIT, Apache-2.0, BSD, ISC) before writing something.
  Clone into `references/`, copy and adapt, log it.
- **Privacy:** no real personal data in code, tests, logs or prompts sent to
  providers that may train on it. Candidate files and recordings are private
  and served only through signed URLs.
- **Cross-platform:** every script runs on Windows and macOS (Node or Python,
  never bash-only). Line endings are LF.
- **Agent-agnostic:** rules, skills, MCP config and plans live in the repo.
  Nothing an agent needs may exist only in one tool's private settings.

## Risks and how we handle them

Current workarounds and deferred items are tracked in
`docs/known-limitations.md`.

| Risk | Handling |
|---|---|
| **Scraping LinkedIn, Indeed and similar sites** breaks their terms of service. It can lead to blocked IPs, legal letters, and in LinkedIn's case, lawsuits. | Scrapers are isolated adapters, each with an off switch. Jobs link back to the source. No logged-in scraping. A takedown process. Review with a lawyer before public launch. |
| **The prototype's Gemini key** was visible in the old site's page source, and may be a free-tier key, which lets Google use the data sent to it. | Use it only with synthetic or test data. Set quotas on it. Replace it with a paid key before real users (Phase 10.4 at the latest). |
| **No domain yet.** Supabase's built-in email and Resend's test sender only deliver to the team's own addresses. | Google sign-in works meanwhile. Email confirmation is off until the domain is verified. Emails are tested against the owner's address. |
| **The repository is public** (ADR 0009), so code, prompts, plans, issues and commit emails are visible to anyone. | Secret scanning in hooks and CI; policy SEC-10 (nothing confidential in commits, PRs or issues). Move to a private repository with Vercel Pro before teammates join or confidential material is needed. |
| **Vercel's free Hobby plan is for non-commercial use only**, and its scheduled jobs run at most once a day. | Develop on Hobby; move to Pro before outside people use the site. Inngest handles schedules. |
| **Video recordings and proctoring are sensitive data.** | Explicit consent per interview, a retention limit, private storage, access logs, data kept in the Mumbai region. |
| **Full contact details visible to recruiters.** | Consent during onboarding, a hide-my-profile switch, recruiter approval, daily view quotas, view audit log. |
| **Three services mean more wiring.** | Generated OpenAPI clients, one CI pipeline, one `pnpm dev` command. |
| **AI costs grow with video interviews and per-person newsletters.** | Daily caps, provider spending limits, cost tracking in `ai_calls`. |
| **Model compatibility** (some Gemini Live preview models have known issues with LiveKit). | Check the chosen model in 5.1; keep a fallback model in the registry. |

## What the owner needs to provide

| When | What |
|---|---|
| Now | Approve this roadmap. Decide on GitHub branch protection (see below). |
| Phase 0 | Run `vercel login` and `pnpm supabase login` in a terminal (browser sign-ins). Docker Desktop running for the local database. Add the Supabase callback URLs to the Google OAuth client (exact URLs provided once the Supabase projects exist). Set the Google consent screen to "In production", or add test users. |
| Phase 3 | Inngest account. Free API keys for Adzuna, Jooble, Careerjet and Reed. |
| Phase 5 | LiveKit Cloud account and `lk cloud auth`. Optionally an Anam or Tavus key for the avatar. |
| Phase 8 | Resend account; later, the domain's DNS records for email. |
| Phase 9 | Razorpay test keys. Content: founder bio, stories and testimonials, programme details if they changed. |
| Before the demo | Vercel Pro and Supabase Pro for production; a paid AI key; the domain. |

## Expected costs (check current prices; these are approximate)

| Service | Free tier enough for | When to pay |
|---|---|---|
| GitHub Team (about $4 per user per month) | n/a | Needed for branch protection on a private repo. |
| Vercel Pro (about $20 per member per month) | Development | Before outside people use the site (Hobby is non-commercial). |
| Supabase Pro (about $25 per month per production project) | Development and staging | Before the demo (free projects pause when idle; 1 GB storage is too small for recordings). |
| LiveKit Cloud | Early testing | When interview minutes exceed the free allowance. |
| Resend | Development | When sending to many candidates. |
| Inngest | Early stages | When job runs exceed the free allowance. |
| AI providers | n/a | Usage-based; set spending limits. |

## Open questions (with the assumption used until answered)

1. **"Video capabilities" in interviews.** Assumed: the candidate's camera is
   on, Lynx can see it, it is recorded with consent, and it drives
   proctoring. An AI interviewer with its own video face is optional (5.8).
2. **Affiliated jobs in ranking.** Assumed: no ranking boost; they get the
   tag and an "Affiliated only" filter.
3. **Recording retention.** Assumed: 180 days, then deleted.
4. **Programmes and prices.** Assumed: the four programmes and fees from the
   prototype stay the same.
5. **Old Academy sign-ups** (the SIGNUP tab of the Google Sheet). Assumed: not
   migrated as accounts; can be imported later as leads.
6. **GitHub account `sujaan-web`**: answered. It belongs to the owner; both
   `Sujaanb` and `sujaan-web` own the organization. Work is committed and
   merged as `Sujaanb` (see `infra/README.md`).

## GitHub branch protection

The repository is public (ADR 0009), so GitHub offers branch protection on
the free plan. Suggested rules for `main`: pull request required, the CI
checks required, no force pushes, no deletion. No required approvals while
the owner is the only contributor (GitHub never lets someone approve their
own PR); the owner merges protected-area PRs after reviewing them.
