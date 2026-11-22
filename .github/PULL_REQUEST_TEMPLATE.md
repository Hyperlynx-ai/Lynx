<!-- If this PR is built on another open PR, write "Merge after #N" on the first line. -->

## Roadmap chunk

<!-- e.g. 2.5 CV editor (docs/roadmap.md). Write "none" for work outside the roadmap. -->

## What changed (plain language)

<!-- 2-4 sentences a non-technical teammate understands: what this does and why. -->

## How to check it

<!-- Steps to try it on the Vercel preview: which page, what to click, what you should see. -->

## Areas touched

- [ ] apps/web
- [ ] apps/api
- [ ] services/ai
- [ ] services/interview-agent
- [ ] packages/
- [ ] supabase/ (database, auth or storage config) - protected
- [ ] CI, deployment or agent config (.github, infra, .agents, ...) - protected
- [ ] Docs or policies (root AGENTS.md and docs/policies are protected)

## Checklist

- [ ] Lint, type check, tests and build pass
- [ ] No secrets, keys or real personal data committed
- [ ] No unrelated refactors or reformatting
- [ ] UI changes follow the void-terminal-glass design skill (checklist run)
- [ ] AI changes (prompts, models, ranking) include eval results
- [ ] Reused code is logged in docs/third-party.md
- [ ] New dependencies are explained below (what, why, license)
- [ ] docs/roadmap.md status updated
- [ ] If a protected area was touched: the owner is asked to review and merge

## Risks and notes for the reviewer

<!-- What could break, assumptions the agent made, open questions. -->
