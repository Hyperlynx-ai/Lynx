# Prompt templates

> Status: ACTIVE. Copy, fill in the `<...>` parts, and paste into your agent.

## Start a chunk

```
Read AGENTS.md, docs/roadmap.md and docs/policies/. Then work on roadmap
chunk <number, e.g. 2.5>. Update main, create the branch named in the
roadmap, build the chunk, commit small steps, run lint, type check, tests
and build, update the chunk's status in docs/roadmap.md, and open a pull
request using the template. If anything touches a protected area or needs
the owner, stop and tell me.
```

## Fix a bug

```
Read AGENTS.md. There is a bug: <describe what you see, where, and what you
expected>. Update main, create a branch named fix/<short-name>, find the
cause, fix it, add a test that would have caught it, run all checks, and
open a pull request explaining the cause and the fix in plain language.
```

## Add or change a page or component (UI)

```
Read AGENTS.md and .agents/skills/void-terminal-glass/SKILL.md (and its
references/components.md). Then <describe the page or component>. Use the
shared components and tokens in packages/ui. Run the design skill's
checklist before finishing, and open a pull request with screenshots.
```

## Reuse a component from another repository

```
Read AGENTS.md and docs/policies/05-dependencies-and-licensing.md. I want to
reuse <what> from <GitHub URL>. Clone it shallowly into references/, check
its license and tell me what it is before copying anything. If the license
is allowed, copy and adapt only what we need into the right folder, restyle
it to the void-terminal-glass design skill, log it in docs/third-party.md,
and never import from references/.
```

## Review a PR before merging

```
Read AGENTS.md. Review pull request <number or link>: re-read the full diff,
check it follows the policies, list any risks, and tell me whether it can be
merged under docs/policies/01-git-workflow.md (rule GIT-10). Do not merge a
PR with the protected-area label.
```

## Explain something

```
Explain in plain language, without jargon, what <file, folder, PR or error>
does and why it matters. Keep it short.
```
