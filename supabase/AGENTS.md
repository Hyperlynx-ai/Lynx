# supabase/: agent guide

Database schema, auth settings and storage for Hyperlynx. **This whole folder
is a protected area**: the owner merges every PR that changes it. Read
`docs/policies/07-database-and-migrations.md` first.

## Environments

| Environment | Where | How it gets migrations |
|---|---|---|
| Local | Docker on your machine (`pnpm db:start`) | `pnpm db:reset` |
| Staging | Supabase project `lynx-staging` (ref `ilwyezmqbnwwujeeonsv`, Mumbai) | CI after merge to `main` |
| Production | Supabase project `lynx-prod` (ref `sgpcgcetujzvtlcolfyw`, Mumbai) | CI after staging succeeds |

Nobody runs `supabase db push` or `config push` against staging or production
by hand (policy DB-06); `.github/workflows/db-migrate.yml` does it.

## Commands (from the repo root)

| What | Command |
|---|---|
| Start the local stack (needs Docker) | `pnpm db:start` |
| Stop it | `pnpm db:stop` |
| New migration | `pnpm supabase migration new <short_name>` |
| Rebuild local DB from all migrations + seed | `pnpm db:reset` |
| Run database tests (pgTAP) | `pnpm db:test` |
| Regenerate TypeScript schema after a migration | `pnpm db:pull` |
| Local dashboard (Studio) | http://127.0.0.1:54323 |

## Rules

- Schema changes only as new files in `migrations/`; never edit one already
  on `main` (CI checks this).
- Every new table: `enable row level security` and explicit policies in the
  same migration, plus a pgTAP test in `tests/database/`.
- Personal-data files go in private buckets; the browser gets signed URLs.
- `config.toml` holds auth settings. Secrets are `env(...)` references,
  filled from `supabase/.env.local` locally and from GitHub secrets in CI.
- `seed.sql` is local-only and synthetic.
