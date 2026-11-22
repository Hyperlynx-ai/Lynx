# What to do when stuck

> Status: ACTIVE. For teammates who build through an AI agent.

## Stop and message the owner when

- the agent says a change touches a **protected area**, or the PR got the
  `protected-area` label;
- the agent wants to delete many files, drop database tables, or change
  anything about payments, login, or which AI provider is used;
- checks stay red after the agent tried twice to fix them;
- the agent suggests disabling a test, skipping a check, or using
  `--no-verify`;
- the agent seems to be going in circles, or changing things unrelated to
  your task;
- you are not sure what the task means;
- something on the live site is broken.

## How to ask

Comment on your PR or issue, tag **@Sujaanb**, and include:

1. What you were trying to do (the chunk number).
2. What happened (copy the error message or the agent's last message).
3. What the agent suggested.
4. A link to the PR or issue.

Then stop working on that part until the owner replies. You can pick a
different task meanwhile.

## If the live site is broken

1. Open the PR that was merged most recently and click **Revert** on GitHub.
   Merge the revert PR. (Or ask your agent to do it.)
2. Tell the owner right away.

Reverting is always safe: it undoes the change and the site redeploys.

## Things you can safely ask the agent

- "Explain what this PR changes in plain language."
- "Why did this check fail? Fix it without disabling anything."
- "Re-read AGENTS.md and check that your changes follow it."
- "Run the checks again."
