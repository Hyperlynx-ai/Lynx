# 0002: Supabase for data, login and files; SQL migrations via the CLI

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

We need a relational database (jobs, candidates, applications), vector
search for AI matching, email and Google login, and private file storage for
CVs and interview recordings. Both TypeScript and Python must read the data.

## Decision

- Supabase: Postgres + pgvector, Auth (email + Google), Storage.
- Two hosted projects, `lynx-staging` and `lynx-prod`, in the Mumbai region
  (most candidates are in India). Local development runs Supabase in Docker.
- The schema lives only in SQL migrations in `supabase/migrations/`, managed
  with the Supabase CLI (installed as a dev dependency, so everyone uses the
  same version). Auth and storage settings live in `supabase/config.toml`.
- TypeScript uses Drizzle with a schema pulled from the database
  (`packages/db`); Python uses SQLAlchemy Core with psycopg.
- Migrations reach staging and production only through CI.

## Consequences

- SQL is language-neutral and can express row-level security and storage
  policies, which ORM migration tools handle poorly.
- One vendor for several needs; it is open source, so self-hosting stays
  possible.
- Free projects pause when idle and have 1 GB storage: production moves to
  the Pro plan before the demo.
