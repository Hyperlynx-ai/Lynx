# .agents/

Shared setup for **every** AI agent tool used on this project. This folder is
the canonical copy; other tools' folders are generated from it.

| File or folder | What it is |
|---|---|
| `skills/` | Agent skills (folders with a `SKILL.md`). Codex, opencode, Gemini CLI and Kilo Code read this folder directly. |
| `mcp.json` | MCP servers every tool should have. |
| `guardrails.json` | Shell commands agents must never run. |

After changing anything here, run:

```
node scripts/agents-sync.mjs
```

It mirrors skills into `.claude/skills/` and writes the MCP and permission
files for Claude Code, Cursor, VS Code/Copilot, Gemini CLI and opencode.
CI fails if you forget. Never edit the generated files directly.

## Skills

- `void-terminal-glass`: the website's design language. Read it before any
  UI work (pages, components, styles, emails).
