# 0006: Background jobs with Inngest

- Status: superseded in part by 0011 (scheduling moved to GitHub Actions, 2026-11-26)
- Date: 2026-11-22
- Decided by: owner approved the roadmap that includes it

## Context

Job ingestion from many sources, embeddings, job alerts every 2 days and a
personalized weekly newsletter all run on schedules and fan out to many
items. Vercel functions have time limits, and Hobby cron runs once a day.

## Decision

Use Inngest: scheduled and event-driven functions in both `apps/api`
(TypeScript SDK) and `services/ai` (Python SDK), split into small, retried
steps that fit Vercel's limits, with concurrency and rate limits for AI
providers.

## Consequences

- No queue infrastructure to run; retries and run history come built in.
- One more account. If Inngest does not fit when chunk 3.2 is built, the
  fallback is Supabase Queues plus Vercel Cron.
