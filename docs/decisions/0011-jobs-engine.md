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
demand. "Run now" in the admin console marks a source as requested; an
hourly workflow picks requests up (no GitHub token needed in the app).
Workflow logs are public: they print counts and source names only, never
personal data or secrets. Inngest may come back for event-driven work
(emails, Phase 8).

**Sources** are adapters in `services/ai/lynx_ai/jobs/sources/`, one per
source, each returning raw postings; the rest of the pipeline is shared.
Each source has a row in `job_sources` with an on/off switch, run history
and health. Order: the curated Google Sheet (3.3), free APIs (3.4: Arbeitnow,
Remotive, RemoteOK, Himalayas, Jobicy, The Muse, and with keys Adzuna,
Jooble, Careerjet, Reed), public ATS boards (3.5), then scrapers (3.6).
Terms and attribution are checked before a source is switched on.

**Curated sheet** (owner): synced daily from the team's Google Sheet for
now; a better approach will be decided later. The sheet ID is configuration
kept in a secret (`CURATED_SHEET_ID`), not in the repository.

**Storage** (`supabase/migrations`, row-level security on):

| Table | Holds |
|---|---|
| `job_sources` | one row per source: kind (curated, api, ats, scraper), enabled, config, run requested, last run status, counts |
| `job_runs` | one row per source run: timings, fetched / new / updated / expired counts, error |
| `jobs` | normalized postings: source + external id (unique), URL, title, company, location, country, remote, type, seniority, field, salary, posted / deadline, first / last seen, status, affiliated flag, de-duplication key, `duplicate_of` |
| `job_matches` (3.7) | per candidate and job: score, rank, one-line reason |

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
successful run, when its deadline has passed, or 60 days after posting.
Expired jobs are deleted 30 days later (space, KL-06).

**Matching (3.7):** embeddings for jobs and candidates (NVIDIA NIM
embedding model, pgvector); score = similarity plus field, skills,
seniority and country signals; the AI re-ranks the top 50 per candidate
with a one-line reason. Stored in `job_matches`; recomputed after the daily
ingestion and when a candidate's profile or matching CV changes. Candidate
data goes to the AI provider, so test data only until KL-05 is resolved.

**Secrets:** database passwords (already in GitHub Actions), source API keys,
`CURATED_SHEET_ID` and `NVIDIA_API_KEY` live in GitHub Actions secrets and,
where the web or API needs them, in Vercel. Never in the repository or logs.

## Consequences

- No new accounts or paid plans; ingestion isn't bound by Vercel limits.
- "Run now" waits up to an hour (or the owner starts the workflow from
  GitHub). Accepted for now.
- Scrapers run from GitHub's IP ranges and may be blocked; the switches turn
  any source off instantly.
