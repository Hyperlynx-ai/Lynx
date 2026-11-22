# Git workflow

> Status: ACTIVE. How changes move from a branch to production.

`main` is production: every merge to `main` deploys. Everything below exists
to keep `main` working.

## Rules

**GIT-01: MUST NOT commit to, push to, force-push, or delete `main`.**
*Why:* `main` is deployed to production; a bad push breaks the site for everyone.
*Enforced by:* local git hook (lefthook) and agent tool settings; branch protection once the GitHub plan allows it.

**GIT-02: MUST do each roadmap chunk on its own branch named `<type>/p<phase>-<short-name>`.**
Types: `feat`, `fix`, `chore`, `docs`, `ci`, `test`. Example: `feat/p2-cv-editor`. Work outside the roadmap uses the same types without the phase, e.g. `fix/login-redirect`.
*Why:* small, named branches make it obvious who is doing what, and keep PRs reviewable.
*Enforced by:* code review

**GIT-03: MUST commit small and often, with conventional commit messages.**
Format: `type(optional-scope): what changed`, for example `feat(web): add candidate login page`.
*Why:* a readable history makes it easy to find and revert a mistake.
*Enforced by:* honor system

**GIT-04: MUST open a pull request to `main` using the PR template, including the roadmap chunk and a plain-language summary.**
*Why:* the owner and teammates review through the PR description, often without reading code.
*Enforced by:* code review

**GIT-05: MUST stay within the chunk's scope.** No unrelated refactors, renames or reformatting of files you did not need to change. If you change a shared package (`packages/*`), say so in the PR.
*Why:* several people's agents work in parallel; surprise changes cause conflicts and breakages.
*Enforced by:* code review

**GIT-06: MUST keep everything working on both Windows and macOS.** Scripts are Node or Python, never bash-only. Line endings are LF (enforced by `.gitattributes`).
*Why:* the team uses both.
*Enforced by:* `.gitattributes`; code review

**GIT-07: MUST keep agent instructions tool-neutral.** Rules go in `AGENTS.md` files; skills and MCP servers go in `.agents/`; then `node scripts/agents-sync.mjs` mirrors them into each tool's folders.
*Why:* teammates use different agent tools; all of them must see the same rules.
*Enforced by:* automated (CI checks that the mirrors are in sync)

**GIT-08: MUST update the chunk's status in `docs/roadmap.md` in the same PR.**
*Why:* the roadmap is how the next agent knows what is done.
*Enforced by:* code review

**GIT-09: MUST merge the latest `main` into your branch before opening a PR, and again if `main` moved while the PR was open.**
*Why:* conflicts get resolved on your branch instead of on `main`.
*Enforced by:* honor system

**GIT-10: An agent MAY merge its own PR only if all of these are true:** CI is green; the PR has no `protected-area` label; the template is complete; the agent re-read the full diff and listed risks in the PR. Merge with **"Create a merge commit"**. Otherwise, ask the owner (@Sujaanb) to review and merge.
*Why:* keeps the team fast while the owner controls the risky parts.
*Enforced by:* honor system (the label is automated)

**GIT-11: If a merge breaks production, MUST revert first, then fix.** Click "Revert" on the PR (or use Vercel's instant rollback), tell the owner, then fix on a new branch.
*Why:* restoring service matters more than finding the cause.
*Enforced by:* honor system

**GIT-12: A PR built on top of another open PR MUST say "Merge after #N" at the top of its description.** Merge them in that order.
*Why:* merging out of order produces confusing diffs.
*Enforced by:* code review
