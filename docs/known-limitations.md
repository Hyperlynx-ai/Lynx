# Known limitations

Things we know are missing, risky or worked around, because of a current
limitation (budget, no domain, a tool's plan, time). Nothing here is
forgotten: each item says what it affects and what unblocks it.

**Rules for agents and teammates**

- When you defer something because of a limitation, add it here in the same
  PR (next free `KL-` number) and mention it in the PR description.
- When you fix one, move it to "Resolved" with the PR number. Never delete
  entries.
- Check this list before starting a chunk: some items block or change it.

## Open

| ID | Limitation | What it affects | Unblocked by | Revisit |
|---|---|---|---|---|
| KL-01 | **Vercel Hobby plan** (free): non-commercial use only; only the owner's commits deploy; scheduled jobs at most once a day. | Teammates' PRs get no previews; outside users shouldn't use the site; jobs need Inngest (0006). | Vercel Pro. | Before teammates contribute and before outside users. |
| KL-02 | **Public repository** (ADR 0009), forced by KL-01: Hobby can't connect a private organization repository. | Code, prompts, plans, issues and commit emails are visible to anyone. Nothing confidential may be committed (SEC-10). | Vercel Pro, then make the repository private. | Same as KL-01. |
| KL-03 | **No branch protection on `main`** (owner's choice for now). Only local git hooks and agent rules stop pushes to `main`. | Anyone with write access can push to `main` from GitHub. | Turn on branch protection (free for public repositories): PR required, CI required, no force push, no deletion. | When teammates join. |
| KL-04 | **No email domain.** Supabase's built-in email only reaches members of the Supabase organization and is rate-limited (a few per hour). | Email confirmation at sign-up is **off** (anyone can sign up with any address); password-reset emails only reach the team; job alerts and newsletters (Phase 8) can't be sent. | A domain + Resend, then Supabase custom SMTP (8.1); turn email confirmation on. | Phase 8, or as soon as the domain is available. |
| KL-05 | **Prototype's Gemini key**, possibly a free-tier key (Google may use what we send). | Policy AI-02: only synthetic or test data may go to the AI until a paid key is in place. No real CVs in production. | A paid AI provider key with a spending limit. | Before real users (10.4 at the latest). |
| KL-06 | **Supabase free plan**: projects pause after a week without activity; 500 MB database, 1 GB storage; no point-in-time backups. | Production can go to sleep before a demo; CVs and interview recordings will outgrow storage. | Supabase Pro for `lynx-prod`. | Before the demo (10.5). |
| KL-07 | **Google sign-in has no automated test** (needs a real Google account). The server-side steps it relies on are tested. | A Google-specific regression would only be noticed by hand. | A Google test account usable in CI, or a manual check in every auth-related PR. | When auth changes. |
| KL-08 | **Previews use the staging database**, which only receives a PR's migrations after it merges. | A PR that adds tables shows errors on its own preview until merged. | Supabase branching (paid) or applying migrations to staging per PR. | When it starts slowing reviews. |
| KL-09 | **No rate limiting on the API yet** (policy SEC-07). Supabase Auth has its own limits; AI calls have per-user daily caps from Phase 2.1. | Public API endpoints could be hammered. | Rate limiting in `apps/api` (e.g. per user and per IP). | Before public launch (10.4). |
| KL-10 | **Free-email list is curated** (~33 providers). Disposable-email services aren't blocked. | A fake recruiter could sign up. | Manual recruiter approval (4.1) is the real gate; optionally a maintained disposable-domain list. | Phase 4. |
| KL-11 | **Admin user list** shows the newest 100 accounts; no search or paging. | Fine while small. | Full admin console (10.1). | Phase 10. |
| KL-12 | **macOS setup not verified** (`pnpm setup:check`, `pnpm dev`, hooks) on a fresh clone. | A teammate on a Mac might hit a setup issue. | Run the README setup on the Mac. | Next time the owner works on the Mac. |
| KL-13 | **Major upgrades held back**: TypeScript 7 (typescript-eslint and Vercel's API build don't support it yet) and `@types/node` above 22 (must match the Node 22 runtime). Dependabot ignores these majors. | We stay on TypeScript 5.x and Node 22 types. | typescript-eslint support for TS 7; moving the runtime to a newer Node LTS. | Every few months. |
| KL-14 | **`hyperlynx.ai` domain** serves the old `hyperlynx-frontend` project; the owner will decide what happens to it. Its DNS is at a third-party provider. | Lynx runs on `lynx-web-pi.vercel.app`; no custom domain, no email domain (KL-04). | Owner decision. | When the owner says. |
| KL-15 | **Vercel compiles `apps/api` with TypeScript strict mode off.** We run an extra non-strict check (`tsconfig.vercel.json`) so code compiles both ways. | Code relying on strict-only narrowing fails on Vercel even though local checks pass (caught by the extra check). | A Vercel setting or build change that honours our tsconfig. | When Vercel's Node builder changes. |
| KL-16 | **Python AI service cold start** on Vercel takes a few seconds. | First request after idle is slow; the API's health check waits up to 10 s. | Keep-warm pings, or Fluid compute / a paid plan with longer-lived instances. | When AI features are user-facing (Phase 2+). |
| KL-18 | **No AI cost estimates.** `prices:` in `services/ai/config/models.yaml` is empty while we use a free key, so `ai_calls.cost_usd` is empty. Token counts are logged. | The admin usage view shows tokens, not money. | Fill in `prices:` from the provider's price list. | With the paid key (KL-05). |
| KL-19 | **The deployed API can't import workspace TypeScript packages** (`@lynx/shared`): Vercel compiles `apps/api` file by file into `.js`, but the package's `exports` point at `.ts`, so the function crashes on start. Files the API needs are copied into `apps/api/src/shared/` by `pnpm shared:sync`; CI checks the copies and ESLint blocks `@lynx/shared` imports in the API. | One extra step when changing a shared file the API uses. | A build step for `packages/shared`, or bundling the API ourselves. | If more shared code is needed by the API. |
| KL-20 | **Free-tier AI quotas per model: 20 requests per day per model** (measured 2026-11-24, `GenerateRequestsPerDayPerProjectPerModel-FreeTier`), and parallel requests are refused (429). Each Gemini model has its own quota. Evals and testing can use up the fallback model's quota, so a brief outage of the primary (503) then fails the call instead of falling back. Seen during 2.4 testing: `gemini-3.5-flash` returned 429. | Occasional "Lynx couldn't read this" errors; the candidate can retry. | A paid key (KL-05), or a second provider as fallback in `models.yaml`. | With the paid key. |
| KL-21 | **NVIDIA NIM free access** (build.nvidia.com) is our primary AI provider: trial terms, rate limits per model, and models get retired without much notice (the requested `deepseek-v4.1-flash` reached end of life on 2026-11-16). | A retired or rate-limited model fails over to the next one in `models.yaml`; quality and speed can drop. Test data only, as with Gemini (AI-02). | A paid provider account with a contract and stable model versions. | With the paid key (KL-05); check `/v1/models` when a model fails with 404/410. |
| KL-22 | **Scanned PDFs (no text layer) can't be read by the primary model.** NIM models get the PDF's text, not the file; only the Gemini fallbacks read files directly, but the input is chosen by the primary model. | A scanned CV shows "No text found in the file"; the candidate can upload a DOCX or a text PDF. | OCR before parsing, or a vision-capable primary model for PDFs. | When real CVs arrive (after KL-05). |
| KL-23 | **CV PDFs use the built-in PDF fonts** (Times, Helvetica), which cover Latin text only. | Names or text in other scripts (e.g. Devanagari, Arabic) and some symbols (e.g. ₹) don't show in the PDF; the Word export is fine. | Register an open font with wide coverage (e.g. Noto Sans) in `apps/web/src/lib/cv-export/pdf.tsx`; it adds ~1-2 MB, loaded on demand. | When candidates need non-Latin CVs. |

## Resolved

| ID | Limitation | Resolved in |
|---|---|---|
| KL-17 | `gemini-3.8-flash` overloaded | Superseded: NVIDIA NIM became the primary provider and 3.8 isn't used (2.5 PR). |
