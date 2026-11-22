# 0001: Three services in one monorepo

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

The platform needs a web UI, business logic with permissions, payments and
emails, and a lot of AI work (CV parsing, ranking, interviews, newsletters).
We considered one full-stack Next.js app (fastest) and three separate
services.

## Decision

One monorepo with:
- `apps/web`: Next.js (App Router, TypeScript), including the admin console.
- `apps/api`: Fastify (TypeScript), the only place that decides permissions.
- `services/ai`: Python (FastAPI) for AI tasks and batch jobs.
- `services/interview-agent`: Python LiveKit Agents worker (see 0004).

The browser talks only to `apps/api` (through a `/api/*` rewrite on the web
app), to Supabase Auth and Storage, and to LiveKit. `services/ai` is internal
and called by `apps/api` with a service token. Contracts are OpenAPI specs
with generated clients in `packages/types`.

## Consequences

- Python gets the best AI ecosystem; TypeScript keeps the UI and API typed end
  to end.
- More wiring than a single app: three deploys, generated clients, one CI.
- Clear boundaries make it easy to scale or move one service later.
