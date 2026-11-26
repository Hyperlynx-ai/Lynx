# apps/web: agent guide

The Next.js app: public site, candidate app, recruiter app and admin console
(`/admin`). The root `AGENTS.md` still applies.

**Before any UI work, read `.agents/skills/void-terminal-glass/SKILL.md`
(and `references/components.md`).** Every page follows that design language.

## Stack

- Next.js 16 (App Router, React 19, TypeScript strict). Next.js 16 changed
  several APIs; when unsure, read the docs bundled in
  `node_modules/next/dist/docs/` instead of relying on memory.
- Tailwind CSS v4 with the design tokens from `@lynx/ui` (see
  `packages/ui/AGENTS.md`). Never use raw colours or radii.
- Shared components come from `@lynx/ui/components/<name>`.

## Commands (run from the repo root)

| What | Command |
|---|---|
| Run everything (web 3000, api 4000, ai 4500) | `pnpm dev` |
| Only the web app | `pnpm --filter web dev` |
| Lint / types / build | `pnpm --filter web lint` · `typecheck` · `build` |
| Browser tests (needs `pnpm db:start` + `pnpm db:env`) | `pnpm e2e` |

## Conventions

- Routes live in `src/app/`. Route groups separate areas:
  `(public)`, `(candidate)`, `(recruiter)`, `admin`.
- App-specific components in `src/components/`; reusable ones go to
  `packages/ui`.
- The browser calls the backend only through `/api/*`, which `next.config.ts`
  forwards to `apps/api` (`API_URL`). Never call `services/ai` from here.
- Server-only secrets never use the `NEXT_PUBLIC_` prefix (policy SEC-04).
- Copy: plain, specific language. Hyperlynx is the company; Lynx is the AI
  agent.

## Tests

- End-to-end tests live in `e2e/` (Playwright). Use synthetic `@example.test`
  emails (`testEmail()` in `e2e/helpers.ts`), and match notices by text with
  `expectAlert()` (Next.js adds its own hidden role="alert" element).
- CI runs them against a local Supabase stack (`.github/workflows/e2e.yml`).

## Authentication (protected area: owner merges changes)

- Supabase Auth via `@supabase/ssr`: `src/lib/supabase/client.ts` (client
  components), `server.ts` (server components, route handlers), `proxy.ts`
  (session refresh). `src/proxy.ts` is Next.js 16's middleware.
- Areas and roles: `/app` candidate, `/recruiter` recruiter, `/admin` admin
  (`src/lib/auth/roles.ts`). `/recruiters` (plural) is the public recruiter
  landing page.
- Every signed-in area's `layout.tsx` calls `requireRole(role, path)`; never
  rely on the proxy alone for permissions.
- Every login ends at `/auth/continue?expect=<role>&next=<path>`, which sends
  people to their area and handles "wrong login page".
- To call `apps/api` as the user: get the access token with
  `supabase.auth.getSession()` (client) and send
  `Authorization: Bearer <token>` to `/api/...`.
- Show users plain messages from `src/components/auth/messages.ts`, never raw
  Supabase errors.

## Environment

Copy `.env.example` to `.env.local`. Deployed values live in Vercel
(project `lynx-web`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
