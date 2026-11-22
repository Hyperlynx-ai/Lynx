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
| Run everything (web 3000, api 4000, ai 8000) | `pnpm dev` |
| Only the web app | `pnpm --filter web dev` |
| Lint / types / build | `pnpm --filter web lint` · `typecheck` · `build` |

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

## Environment

Copy `.env.example` to `.env.local`. Deployed values live in Vercel
(project `lynx-web`).
