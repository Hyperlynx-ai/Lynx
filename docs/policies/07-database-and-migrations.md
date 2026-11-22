# Database and migrations

> Status: ACTIVE. Schema changes, migrations and destructive operations.

The database is Supabase Postgres. The schema is defined only by SQL
migrations in `supabase/migrations/`, applied with the Supabase CLI.
TypeScript (Drizzle) and Python read the same tables.

## Rules

**DB-01: MUST change the schema only by adding a new migration** (`pnpm supabase migration new <name>`), never through the Supabase dashboard.
*Why:* the dashboard leaves no history; local, staging and production drift apart.
*Enforced by:* code review

**DB-02: MUST NOT edit or delete a migration that is already on `main`.** Fix mistakes with a new migration.
*Why:* applied migrations have already run in production.
*Enforced by:* automated (CI check)

**DB-03: Migrations MUST be backward compatible** with the code currently in production: add a column before using it; stop using a column before removing it in a later migration.
*Why:* the database and the apps do not deploy at the same instant.
*Enforced by:* code review

**DB-04: Destructive operations need the owner:** dropping tables or columns, bulk updates or deletes, resetting a remote database.
*Why:* data loss cannot be undone.
*Enforced by:* protected area + honor system

**DB-05: Every table MUST have row-level security enabled** with explicit policies, in the same migration that creates it.
*Why:* Supabase exposes tables to the browser; RLS is the last line of defense.
*Enforced by:* code review

**DB-06: Migrations reach staging and production only through CI after the owner merges the PR.** Nobody runs `supabase db push` against a remote database by hand.
*Why:* one controlled path to production.
*Enforced by:* CI workflow + honor system

**DB-07: After a migration, MUST regenerate the TypeScript schema** (`pnpm db:pull`) and commit it in the same PR.
*Why:* keeps the code's view of the database correct.
*Enforced by:* code review
