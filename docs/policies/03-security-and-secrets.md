# Security and secrets

> Status: ACTIVE. Secrets handling, authorization, and input validation.

## Rules

**SEC-01: MUST NOT commit secrets** (API keys, passwords, tokens, OAuth client secrets, service-role keys, `.env` files, downloaded credential JSON files).
Real values live in `.env.local` (git-ignored) for local work, and in Vercel, Supabase, LiveKit or GitHub settings for deployed environments. Every app keeps an `.env.example` listing variable names with empty or fake values.
*Why:* anything pushed to GitHub must be treated as leaked, even in a private repo.
*Enforced by:* automated (gitleaks in the pre-commit hook and in CI)

**SEC-02: MUST enforce permissions on the server.** Every `apps/api` route checks the caller's role and ownership; every table has row-level security. Hiding a button in the UI is not a permission check.
*Why:* anyone can call the API directly.
*Enforced by:* code review; RLS tests

**SEC-03: MUST validate all external input** (request bodies, query strings, webhooks, file uploads, data from job sources) with zod in TypeScript or Pydantic in Python.
*Why:* unvalidated input is the most common source of security bugs.
*Enforced by:* code review

**SEC-04: The browser MUST NOT receive server-only keys.** Only variables prefixed `NEXT_PUBLIC_` reach the browser, and only public values (such as the Supabase URL and anon key) may use that prefix. The Supabase service-role key is used only in `apps/api` and `services/ai`.
*Why:* the old prototype exposed its AI key in page source; never again.
*Enforced by:* code review

**SEC-05: `services/ai` MUST only accept calls from `apps/api` and the scheduler,** authenticated with a shared service token.
*Why:* it can spend AI budget and read personal data.
*Enforced by:* automated (middleware) and code review

**SEC-06: Files with personal data (CVs, recordings, proctoring snapshots) MUST stay in private buckets** and be served only through short-lived signed URLs.
*Why:* a public link to a CV is a data leak.
*Enforced by:* storage policies in `supabase/`

**SEC-07: MUST rate-limit public and expensive endpoints** (login, sign-up, AI calls, candidate search, profile views) and apply per-recruiter daily quotas.
*Why:* stops abuse, scraping of candidate data, and runaway AI costs.
*Enforced by:* code review

**SEC-08: Webhooks (Razorpay, LiveKit, Inngest) MUST verify their signatures** before doing anything.
*Why:* otherwise anyone can fake a payment or an event.
*Enforced by:* code review

**SEC-09: If a secret leaks, MUST tell the owner immediately and rotate it** at the provider. Deleting the commit is not enough.
*Why:* the secret is already copied wherever the repo was cloned.
*Enforced by:* honor system
