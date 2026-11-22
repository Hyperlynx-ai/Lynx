# @lynx/shared

Small, dependency-free TypeScript helpers used by more than one app.

- `free-email-domains.ts`: personal email providers that recruiter accounts may
  not use. The database (`free_email_domains` in `supabase/migrations`) is what
  enforces the rule; a test fails if the two lists differ. Add a domain to
  both in the same PR (the SQL side needs a new migration).

Import as `@lynx/shared/<file>`. `apps/web` transpiles this package (see
`transpilePackages` in its `next.config.ts`). `apps/api` doesn't import it,
because its production build only compiles its own files.
