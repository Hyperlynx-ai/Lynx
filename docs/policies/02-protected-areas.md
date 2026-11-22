# Protected areas

> Status: ACTIVE. Parts of the repository that only the owner may approve and merge.

A PR that changes any path below is a **protected-area PR**. CI labels it
`protected-area` automatically (`.github/labeler.yml`). Agents may prepare
these PRs but MUST NOT merge them.

| Area | Paths | Why it is protected |
|---|---|---|
| Rules and policies | `AGENTS.md` (root), `docs/policies/`, `CLAUDE.md`, `GEMINI.md` | These define how everyone works. |
| Agent configuration | `.agents/`, `.claude/`, `.codex/`, `.gemini/`, `.cursor/`, `.vscode/mcp.json`, `opencode.json`, `scripts/agents-sync.mjs` | Controls what every agent is told and allowed to do. |
| CI, repo and deployment | `.github/`, `infra/`, `vercel.json` files, `livekit.toml`, `lefthook.yml` | A mistake here can deploy broken code or leak secrets. |
| Database | `supabase/` (migrations, config, seed) | Schema mistakes can lose data. |
| Authentication | `apps/api/src/modules/auth/`, `apps/web/src/lib/auth/`, `apps/web/src/lib/supabase/`, `apps/web/src/proxy.ts` (Next.js 16's middleware), `apps/api/src/lib/supabase-admin.ts` | Security-critical. |
| Payments | `apps/api/src/modules/payments/` | Money. |
| AI models and providers | `services/ai/config/models.yaml` | Decides cost and where candidate data goes. |
| Shared config | `packages/config/`, root `package.json`, `pnpm-workspace.yaml`, `turbo.json` | Affects every app at once. |

## Rules

**PROT-01: MUST NOT merge a PR that touches a protected area.** Prepare it, explain the change in plain language, and tag @Sujaanb.
*Why:* these areas can break production, lose data, cost money or leak personal data.
*Enforced by:* automated label + honor system (branch protection once the GitHub plan allows it)

**PROT-02: SHOULD keep protected-area changes in their own small PR,** separate from feature work, when that is practical.
*Why:* the owner can review a small, focused diff quickly.
*Enforced by:* code review

**PROT-03: MUST NOT change this list or the labeler config without the owner.**
*Why:* removing a path from the list would silently remove its protection.
*Enforced by:* both files are protected
