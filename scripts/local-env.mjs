#!/usr/bin/env node
/**
 * Writes the local Supabase stack's URL and keys into the apps' .env.local
 * files (adds or updates only these keys; everything else is kept).
 * Run after `pnpm db:start`:
 *
 *   pnpm db:env
 *
 * Used by CI for the end-to-end tests, and by teammates setting up a machine.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")

const out = execFileSync("pnpm", ["-s", "supabase", "status", "-o", "json"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
})
const status = JSON.parse(out.slice(out.indexOf("{")))
if (!status.API_URL || !status.PUBLISHABLE_KEY || !status.SECRET_KEY) {
  console.error("✖ The local Supabase stack isn't running. Start it with: pnpm db:start")
  process.exit(1)
}

function upsert(relativePath, values) {
  const path = join(root, relativePath)
  const lines = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : []
  const kept = lines.filter((line) => !Object.keys(values).includes(line.split("=", 1)[0]))
  while (kept.length && kept[kept.length - 1] === "") kept.pop()
  const added = Object.entries(values).map(([key, value]) => `${key}=${value}`)
  writeFileSync(path, `${[...kept, ...added].join("\n")}\n`)
  console.log(`✓ ${relativePath}: ${Object.keys(values).join(", ")}`)
}

upsert("apps/web/.env.local", {
  API_URL: "http://127.0.0.1:4000",
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
})
upsert("apps/api/.env.local", {
  SUPABASE_URL: status.API_URL,
  SUPABASE_SECRET_KEY: status.SECRET_KEY,
  SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
})
