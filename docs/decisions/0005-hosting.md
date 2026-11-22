# 0005: Hosting on Vercel, Supabase, LiveKit Cloud and Resend

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

Speed matters most, nobody on the team should run servers, and
non-technical teammates need an easy way to check a change.

## Decision

- **Vercel** (team "Lynx"): three projects from this repo, each with its own
  root directory: `lynx-web` (`apps/web`), `lynx-api` (`apps/api`, Fastify),
  `lynx-ai` (`services/ai`, FastAPI). Every PR gets preview deployments;
  `main` deploys to production. Until the domain is ready, the production
  URLs are `*.vercel.app`.
- **Supabase** for the database, login and files (see 0002).
- **LiveKit Cloud** for interviews (see 0004).
- **Resend** for email (sending to real recipients needs a verified domain).
- Previews use the staging Supabase project; production uses the production
  project.
- Projects are created and configured with the Vercel and Supabase CLIs.

## Consequences

- No servers to manage; preview links for every PR.
- Vercel's Hobby plan is non-commercial and limits scheduled jobs to once a
  day: move to Pro before outside people use the site.
- Long-running work must be split into short steps (see 0006).
