#!/usr/bin/env node
/**
 * Mirrors the shared agent setup in .agents/ into each agent tool's own files,
 * so every tool (Claude Code, Codex, opencode, Gemini CLI, Kilo Code, Cursor,
 * Copilot) sees the same skills, MCP servers and guardrails.
 *
 *   node scripts/agents-sync.mjs          write the mirrors
 *   node scripts/agents-sync.mjs --check  exit 1 if a mirror is out of date (CI)
 *
 * Edit only the sources:
 *   .agents/skills/<name>/...   shared skills. Codex, opencode, Gemini CLI and
 *                               Kilo Code read this folder directly.
 *   .agents/mcp.json            MCP servers for every tool
 *   .agents/guardrails.json     shell commands agents must never run
 *
 * Generated (never edit by hand; they are overwritten):
 *   .claude/skills/             skills for Claude Code
 *   .claude/settings.json       Claude Code permissions
 *   .mcp.json                   Claude Code MCP servers
 *   .cursor/mcp.json            Cursor MCP servers
 *   .vscode/mcp.json            VS Code / GitHub Copilot MCP servers
 *   .gemini/settings.json       Gemini CLI MCP servers
 *   opencode.json               opencode MCP servers and permissions
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const abs = (posixPath) => join(root, ...posixPath.split("/"));
const toPosix = (p) => p.split(sep).join("/");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (posixPath) => JSON.parse(readFileSync(abs(posixPath), "utf8"));

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/** repo-relative posix path -> file contents (string or Buffer) */
const expected = new Map();
/** folders fully owned by this script: files not in `expected` are removed */
const ownedDirs = [".claude/skills"];

// 1. Skills -> .claude/skills/
const skillsDir = abs(".agents/skills");
for (const file of listFiles(skillsDir)) {
  expected.set(`.claude/skills/${toPosix(relative(skillsDir, file))}`, readFileSync(file));
}

// 2. MCP servers. Every server starts through scripts/mcp-run.mjs so the same
//    command works on Windows and macOS.
const servers = Object.entries(readJson(".agents/mcp.json").servers ?? {});
const launcher = "scripts/mcp-run.mjs";
const launchArgs = (s, prefix = "") => [`${prefix}${launcher}`, s.package, ...(s.args ?? [])];
const withEnv = (s, obj) => (s.env ? { ...obj, env: s.env } : obj);

const mcpServers = Object.fromEntries(
  servers.map(([name, s]) => [name, withEnv(s, { command: "node", args: launchArgs(s) })]),
);
expected.set(".mcp.json", json({ mcpServers }));
expected.set(".cursor/mcp.json", json({ mcpServers }));
expected.set(".gemini/settings.json", json({ mcpServers }));
expected.set(
  ".vscode/mcp.json",
  json({
    servers: Object.fromEntries(
      servers.map(([name, s]) => [
        name,
        withEnv(s, { type: "stdio", command: "node", args: launchArgs(s, "${workspaceFolder}/") }),
      ]),
    ),
  }),
);

// 3. Guardrails (commands agents must never run) + opencode config
const denied = readJson(".agents/guardrails.json").deniedCommands ?? [];
expected.set(
  ".claude/settings.json",
  json({
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    permissions: { deny: denied.map((cmd) => `Bash(${cmd}:*)`) },
  }),
);
expected.set(
  "opencode.json",
  json({
    $schema: "https://opencode.ai/config.json",
    mcp: Object.fromEntries(
      servers.map(([name, s]) => [
        name,
        withEnv(s, { type: "local", command: ["node", ...launchArgs(s)], enabled: true }),
      ]),
    ),
    permission: { bash: Object.fromEntries(denied.map((cmd) => [`${cmd}*`, "deny"])) },
  }),
);

// Compare or write
const problems = [];
for (const [path, content] of expected) {
  const target = abs(path);
  const want = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  const have = existsSync(target) ? readFileSync(target) : null;
  if (have && have.equals(want)) continue;
  if (checkOnly) {
    problems.push(`${have ? "out of date" : "missing"}: ${path}`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, want);
    console.log(`wrote ${path}`);
  }
}
for (const dir of ownedDirs) {
  for (const file of listFiles(abs(dir))) {
    const path = toPosix(relative(root, file));
    if (expected.has(path)) continue;
    if (checkOnly) problems.push(`not in .agents/: ${path}`);
    else {
      rmSync(file);
      console.log(`removed ${path}`);
    }
  }
}

if (checkOnly && problems.length > 0) {
  console.error("Agent mirrors are out of date. Run: node scripts/agents-sync.mjs");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(checkOnly ? "Agent mirrors are in sync." : "Agent mirrors updated.");
