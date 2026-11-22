# Starting a task

> Status: ACTIVE. For teammates who build through an AI agent (Claude Code,
> Codex, opencode, Gemini CLI, Cursor or any other). No coding knowledge needed.

## 1. Pick a task

1. Open the repository's **Issues** tab on GitHub. Each issue is one chunk of
   `docs/roadmap.md` (for example "2.5 CV editor").
2. Pick one with no assignee whose phase is marked `Approved` or
   `In progress` in the roadmap. Click **Assign yourself**. This tells
   everyone else not to touch it.

## 2. Start your agent in the project folder

Open a terminal in the project folder and start your agent. Then paste the
"Start a chunk" prompt from `prompt-templates.md`, filling in the chunk
number.

The agent will:
- read `AGENTS.md`, the roadmap and the policies;
- update `main` and create a branch for you;
- build the chunk, committing as it goes;
- run the checks (lint, type check, tests, build);
- open a pull request (PR).

## 3. Check the result

1. Open the PR link the agent gives you.
2. Read the **"What changed"** section. It should make sense to you without
   reading code. If it doesn't, ask the agent to rewrite it.
3. Wait for the checks at the bottom of the PR to turn green.
4. Open the **Vercel preview** link in the PR (Vercel posts it as a comment)
   and click through what changed. Does it work? Does it look like the rest
   of the site?

## 4. Merge, or ask the owner

- If the PR has the **`protected-area`** label: do not merge. Tag @Sujaanb in
  a comment and wait.
- Otherwise, if checks are green and the preview works: ask your agent to
  merge it (it follows the rules in `docs/policies/01-git-workflow.md`), or
  click **Merge pull request** yourself (use "Create a merge commit").

## 5. Clean up

Ask the agent to switch back to `main` and pull, so you start the next task
from the latest code.

## Golden rules

- Never ask the agent to push to `main` or to "skip the checks".
- One task at a time per branch.
- If the agent says it needs the owner, or you feel unsure: stop and follow
  `what-to-do-when-stuck.md`.
