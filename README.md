# Hyperlynx

A job platform: candidates find jobs, internships and scholarships; recruiters
find verified candidates. **Lynx** is the platform's AI agent: it ranks
opportunities, edits CVs, interviews candidates over voice and video, and
remembers what it learns about each candidate.

## Start here

- Everyone (humans and AI agents): read [AGENTS.md](AGENTS.md) first.
- What we're building, in what order, and current status: [docs/roadmap.md](docs/roadmap.md)
- Rules: [docs/policies/](docs/policies/) · Guides for teammates: [docs/playbooks/](docs/playbooks/)
- Why things were decided: [docs/decisions/](docs/decisions/)

## Set up your computer (Windows or macOS)

You need Node.js 22+, pnpm, uv (Python), Git, and Docker Desktop (for the
local database, from Phase 0.5). Then, in the project folder:

```
npm install -g pnpm@12.21.0
pnpm install
pnpm setup:check
```

`pnpm setup:check` checks everything and prints the exact fix for anything missing.
Copy each `.env.example` to `.env.local` (in `apps/web`, `apps/api` and
`services/ai`). For the local database run `pnpm db:start`, then `pnpm db:env`
to fill in the Supabase values automatically. Ask the owner for anything else.

## Everyday commands

| What | Command |
|---|---|
| Run everything (web, API, AI service) | `pnpm dev` |
| Check everything before a PR | `pnpm check` |
| Browser tests (local database running) | `pnpm e2e` |
| Format code | `pnpm format` |
| Regenerate API types after changing routes | `pnpm api:types` |
| Sync agent skills and MCP configs | `pnpm agents:sync` |
| Make someone an admin (owner only) | `pnpm admin:set-role <email> admin --env production --yes` |

`pnpm dev` starts:

| Service | URL |
|---|---|
| Web app (`apps/web`) | http://localhost:3000 |
| API (`apps/api`) | http://127.0.0.1:4000/health |
| AI service (`services/ai`) | http://127.0.0.1:4500/health |

## Layout

| Folder | What |
|---|---|
| `apps/web` | Next.js: public site, candidate and recruiter apps, admin console |
| `apps/api` | Fastify API: business rules and permissions |
| `services/ai` | Python AI service (FastAPI, Pydantic AI) |
| `services/interview-agent` | Voice and video interview agent (Phase 5) |
| `packages/ui` | Design system: tokens and components (void-terminal-glass) |
| `packages/types` | Typed API contracts generated from OpenAPI |
| `packages/shared` | Small helpers shared by web and API (e.g. free email domains) |
| `packages/db` | Database schema mirror for TypeScript (Drizzle) |
| `packages/config` | Shared TypeScript and ESLint config |
| `supabase/` | Database migrations and config (Phase 0.5) |
| `evals/` | AI evaluation datasets and scripts |
| `docs/` | Roadmap, policies, playbooks, decisions |
| `.agents/` | Shared skills and MCP servers for every agent tool |
| `references/` | Git-ignored clones of other repos and the old prototype |
