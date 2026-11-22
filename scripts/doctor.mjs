#!/usr/bin/env node
/**
 * Checks that this computer has everything needed to work on the repo, and
 * says how to fix what is missing. Works on Windows and macOS.
 *
 *   pnpm setup:check          (or: node scripts/doctor.mjs)
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const isWindows = process.platform === "win32"
const results = []

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWindows,
    }).trim()
  } catch {
    return null
  }
}

function check(name, ok, fix, { optional = false } = {}) {
  results.push({ name, ok, fix, optional })
}

const major = (version) => Number(String(version).replace(/^v/, "").split(".")[0])

// Node
check(
  `Node.js 22+ (found ${process.version})`,
  major(process.version) >= 22,
  isWindows ? "winget install OpenJS.NodeJS.LTS" : "brew install node@22"
)

// pnpm (version pinned in package.json "packageManager")
const wantedPnpm = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
).packageManager?.split("@")[1]
const pnpm = run("pnpm", ["--version"])
check(
  `pnpm ${wantedPnpm} (found ${pnpm ?? "none"})`,
  pnpm !== null && major(pnpm) === major(wantedPnpm),
  `npm install -g pnpm@${wantedPnpm}`
)

// uv + Python (for services/)
const uv = run("uv", ["--version"])
check(
  `uv (found ${uv ?? "none"})`,
  uv !== null,
  isWindows
    ? 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"'
    : "curl -LsSf https://astral.sh/uv/install.sh | sh"
)
if (uv) {
  const py = run("uv", ["python", "find", "3.12"])
  check("Python 3.12 (managed by uv)", py !== null, "uv python install 3.12")
}

// Docker (local Supabase database)
const docker = run("docker", ["info", "--format", "{{.ServerVersion}}"])
check(
  "Docker running (needed for the local database)",
  docker !== null,
  "Install and start Docker Desktop: https://www.docker.com/products/docker-desktop/",
  { optional: true }
)

// Git hooks
const hook = join(root, ".git", "hooks", "pre-commit")
check(
  "Git hooks installed (lefthook)",
  existsSync(hook) && readFileSync(hook, "utf8").includes("lefthook"),
  "pnpm install   (installs the hooks)"
)

// Local env files
for (const app of ["apps/web", "apps/api", "services/ai"]) {
  check(
    `${app}/.env.local exists`,
    existsSync(join(root, app, ".env.local")),
    `Copy ${app}/.env.example to ${app}/.env.local and fill it in (ask the owner for values)`,
    { optional: true }
  )
}

// CLIs used for deployment work (owner and maintainers)
check(
  "Vercel CLI logged in",
  run("vercel", ["whoami"]) !== null,
  "npm install -g vercel && vercel login",
  { optional: true }
)

// Report
let failed = 0
for (const r of results) {
  const mark = r.ok ? "✓" : r.optional ? "!" : "✖"
  console.log(`${mark} ${r.name}`)
  if (!r.ok) {
    console.log(`    fix: ${r.fix}`)
    if (!r.optional) failed++
  }
}
console.log(
  failed === 0
    ? "\nAll required tools are ready. Start everything with: pnpm dev"
    : `\n${failed} required item(s) missing. Fix them, then run pnpm setup:check again.`
)
process.exit(failed === 0 ? 0 : 1)
