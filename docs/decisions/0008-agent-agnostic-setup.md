# 0008: Agent-agnostic setup

- Status: accepted
- Date: 2026-11-22
- Decided by: owner (Sujaan)

## Context

Most work is done by AI agents, and teammates use different tools (Claude
Code, Codex, opencode, Gemini CLI, Kilo Code, Cursor, Copilot). Each tool
looks for instructions, skills and MCP servers in different places. Everything
must work for anyone who clones the repo, on Windows and macOS.

## Decision

- **Instructions:** `AGENTS.md` files are the single source of truth.
  `GEMINI.md` imports `AGENTS.md` (Gemini CLI reads only its own filename by
  default). `CLAUDE.md` only points to `AGENTS.md`, because recent Claude Code
  versions already load `AGENTS.md` and importing it would load it twice.
- **Skills:** the canonical copy lives in `.agents/skills/` (read by Codex,
  opencode, Gemini CLI, Kilo Code and others). `scripts/agents-sync.mjs`
  mirrors it into `.claude/skills/` for Claude Code.
- **MCP servers:** defined once in `.agents/mcp.json`; the sync script writes
  each tool's config file. Servers start through `scripts/mcp-run.mjs` so the
  same command works on Windows and macOS.
- **Guardrails:** shared permission settings for tools that support them
  (`.claude/settings.json`, `opencode.json`) deny pushing to `main`,
  force-pushing and skipping hooks.
- CI fails if the mirrors are out of date.

## Consequences

- One place to edit; every tool sees the same rules and skills.
- Copies instead of symlinks (symlinks are unreliable on Windows), so the
  sync script must be run after changes; CI catches forgotten runs.
