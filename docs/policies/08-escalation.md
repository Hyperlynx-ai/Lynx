# Escalation

> Status: ACTIVE. When an agent must stop and ask the owner, and how.

## How to ask

Comment on the PR or issue, tag **@Sujaanb**, and include: what you were
trying to do, what is blocking you, the options you see, and which one you
recommend. Then stop working on that part until you get an answer.

## Rules

**ESC-01: MUST stop and ask before:**
- changing anything in a protected area (`02-protected-areas.md`);
- adding an auth, crypto, payment or AI-provider dependency;
- any destructive database change, or any change to production data;
- a breaking change to an API that other code depends on;
- changing which provider receives candidate data, or adding a provider;
- anything that adds a paid service or increases running costs;
- deleting or moving many files;
- turning on a new job source that scrapes a website.
*Why:* these are expensive or impossible to undo.
*Enforced by:* honor system

**ESC-02: MUST stop and ask when** checks fail and you cannot fix them without breaking TEST-01, the task is ambiguous, or two rules conflict.
*Why:* guessing wastes time and creates hidden problems.
*Enforced by:* honor system

**ESC-03: MUST NOT work around a block** (by disabling a check, using a different account, or editing a protected file in a non-protected PR).
*Why:* the block is there on purpose.
*Enforced by:* honor system

**ESC-04: If production is broken,** revert the PR that caused it (or roll back in Vercel), then tell the owner (GIT-11).
*Why:* restore first, investigate second.
*Enforced by:* honor system
