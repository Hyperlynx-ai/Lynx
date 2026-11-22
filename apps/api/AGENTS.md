# apps/api: agent guide

The backend API (Fastify 5, TypeScript strict, zod). It is the only place that
decides who may do what (policy SEC-02). The root `AGENTS.md` still applies.

## Commands (run from the repo root)

| What | Command |
|---|---|
| Run everything | `pnpm dev` (API on http://localhost:4000) |
| Only the API | `pnpm --filter api dev` |
| Tests / lint / types | `pnpm --filter api test` · `lint` · `typecheck` |
| Regenerate the typed client after changing routes | `pnpm api:types` |

## Structure

```
src/
  server.ts          entry point (Vercel runs this file; keep the name)
  create-app.ts      buildApp(): registers plugins and every module.
                     (Not named app.ts: Vercel would treat that as the entry.)
  env.ts             all environment variables, validated with zod
  modules/<name>/    one folder per feature
    routes.ts        Fastify routes with zod schemas (request + response)
    service.ts       business logic, no HTTP details
    *.test.ts        Vitest tests using app.inject()
```

## Rules

- Every route declares zod schemas for its input and its response; they
  become the OpenAPI spec (`/openapi.json`) and the typed client in
  `packages/types`. Run `pnpm api:types` and commit the result.
- Every route checks the caller's role and ownership (from Phase 1 on).
- Never log personal data or IP addresses; the logger is configured for this.
- Calls to `services/ai` send `Authorization: Bearer ${AI_SERVICE_TOKEN}`.
- New environment variables go in `src/env.ts` and `.env.example`.
- Tests never call real external services (policy TEST-03): stub `fetch`.
