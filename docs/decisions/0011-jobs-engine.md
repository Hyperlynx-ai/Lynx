# 0011: Jobs engine: sources, scheduling, storage and matching (Phase 3)

- Status: accepted
- Date: 2026-11-26
- Decided by: owner (scheduler, sheet, API keys, scope); details by the
  building agent. Partly supersedes ADR 0006 (scheduling).

## Context

Phase 3 fills the opportunities feed: jobs, internships and scholarships
from many sources (ADR 0007), refreshed daily and ranked for each candidate.
Limits: Vercel Hobby (short functions, one cron a day), Supabase free plan
(500 MB, KL-06), free AI tiers (KL-20, KL-21), a public repository (KL-02).

## Decision

**Scheduling: GitHub Actions** (owner, 2026-11-26), not Inngest. Scheduled
workflows are free for public repositories, run for hours and suit Python
scrapers. `jobs-ingest.yml` runs the ingestion CLI in `services/ai`
(`python -m lynx_ai.jobs ...`) once a day for production; staging runs on
demand. "Run now" in the admin console marks a source as requested and,
when the API has `GITHUB_DISPATCH_TOKEN` (a fine-grained token for this
repository only, "Actions: read and write"), starts the workflow at once for
every requested source; an hourly workflow is the fallback.
Workflow logs are public: they print counts and source names only, never
personal data or secrets. Inngest may come back for event-driven work
(emails, Phase 8).

**Sources** are adapters in `services/ai/lynx_ai/jobs/sources/`, one per
source, each returning raw postings; the rest of the pipeline is shared.
Each source has a row in `job_sources` with an on/off switch, run history
and health. Order: the curated Google Sheet (3.3), free APIs (3.4: Arbeitnow,
RemoteOK, Himalayas, Jobicy, and Reed with a key). Dropped after the terms
check (2026-11-26): Remotive (forbids showing its jobs to collect sign-ups),
The Muse (terms unreadable), Careerjet (needs each visitor's IP and forbids
building a job database); Adzuna and Jooble (no keys, owner). Then public
company boards (3.5): one source per applicant tracking system (Greenhouse,
Lever, Ashby, SmartRecruiters, Recruitee) over an admin-managed company list
(`ats_companies`, Admin -> Companies); Workable was dropped (no seed company
had a public board). Then scrapers (3.6): LinkedIn, Indeed, Glassdoor and
Naukri through JobSpy (MIT), one source each, off until the owner switches
them on (KL-27); daily rotating searches over terms x places in each
source's config. JobSpy sits in the `scrapers` dependency group, installed
only by the workflow. A run is "partial" only when something failed (a
board, a search) or nothing came back.
Terms and attribution are checked before a source is switched on.

**Curated sheet** (owner): synced daily from the team's Google Sheet for
now; a better approach will be decided later. The sheet ID is configuration
kept in a secret (`CURATED_SHEET_ID`), not in the repository.

**Storage** (`supabase/migrations`, row-level security on):

| Table | Holds |
|---|---|
| `job_sources` | one row per source: kind (curated, api, ats, scraper), enabled, config, run requested, last run status, counts |
| `job_runs` | one row per source run: timings, fetched / new / updated / expired counts, error |
| `ats_companies` | companies whose public boards are read: system, board name, company name, on/off |
| `jobs` | normalized postings: source + external id (unique), URL, title, company, location, country, remote, type, seniority, field, salary, posted / deadline, first / last seen, status, affiliated flag, de-duplication key, `duplicate_of` |
| `candidate_match_state` (3.7) | per candidate: profile embedding and hash, requested / matched times, last error |
| `job_matches` (3.7) | per candidate and job: rank, score, label, one-line reason, whether the AI re-ranked it |

Jobs are public data: signed-in users may read active jobs; only the
ingestion (database owner) writes.

**Normalization** (Python, shared by all sources): country (ISO 3166-1
alpha-2) and city from free-text locations, remote, employment type
(full-time, part-time, contract, internship, scholarship, fellowship,
temporary), seniority from the title, field of work, salary when given.

**Scope** (owner): keep jobs located in the 35 countries candidates can
choose (`packages/shared/src/candidate.ts`) and remote jobs open to them;
drop the rest at ingestion.

**De-duplication:** `dedupe_key` = normalized title + company + country.
The first source to bring a job keeps it; the same job from another source
is stored with `duplicate_of` pointing at it and is hidden from the feed.

**Expiry:** a job is expired when its source no longer lists it in a
complete run, when its deadline has passed, or when no run has seen it for 7
days (sources only list open jobs, so old postings that are still listed
stay active). Expired jobs are deleted 30 days later (space, KL-06).

**Matching (3.7):** everything runs in the jobs workflow (Python, as the
database owner); the deployed services only read `job_matches`.
- Embeddings: NVIDIA `nemotron-3.5-embed-1b` (multilingual), 768
  dimensions, stored as `halfvec(768)` (half the space; about 1.5 KB a
  job). Jobs are embedded after each ingestion (`embed`), newest first,
  within a time budget; candidate profiles (onboarding answers, matching
  CV, Lynx's skill/goal/preference facts) are re-embedded only when their
  text changes (`candidate_match_state.profile_hash`).
- Retrieval: the 300 nearest visible jobs in the candidate's countries, or
  remote without a country ("Remote, US" usually needs US residency); exact
  search, no vector index needed at this size.
- Score (0-1): 0.55 similarity + 0.25 same field of work + 0.2 skills the
  job names, then the prototype's seniority adjustments (a student or
  fresher vs a senior role x0.55, ...), internship fit and a small
  freshness bonus. Labels: strong >= 0.6, good >= 0.45, partial >= 0.3.
- The AI (`job_rerank`, eval in `evals/job_rerank.py`) re-ranks the top 30
  with a fit score and one-line reason; the final score averages both. If
  the AI fails, the computed ranking stays, with template reasons.
- The top 100 go to `job_matches`. Recomputed for everyone after the daily
  ingestion, and within minutes when a candidate's matching inputs change:
  a trigger marks `candidate_match_state.requested_at` and the API starts
  the workflow (`GITHUB_DISPATCH_TOKEN`; else the hourly run).
Candidate data goes to the AI provider, so test data only until KL-05 is
resolved.

**Secrets:** database passwords (already in GitHub Actions), source API keys,
`CURATED_SHEET_ID` and `NVIDIA_API_KEY` live in GitHub Actions secrets and,
where the web or API needs them, in Vercel. Never in the repository or logs.

## Consequences

- No new accounts or paid plans; ingestion isn't bound by Vercel limits.
- "Run now" starts within minutes with the dispatch token; without it, it
  waits up to an hour (or the owner starts the workflow from GitHub).
- Scrapers run from GitHub's IP ranges and may be blocked; the switches turn
  any source off instantly.
