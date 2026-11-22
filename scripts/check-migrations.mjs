#!/usr/bin/env node
/**
 * Fails if a pull request edits, renames or deletes a database migration that
 * already exists on the base branch (policy DB-02). Adding new migrations is fine.
 *
 *   node scripts/check-migrations.mjs origin/main
 */
import { execFileSync } from "node:child_process"

const base = process.argv[2] ?? "origin/main"
const dir = "supabase/migrations"

const output = execFileSync("git", ["diff", "--name-status", `${base}...HEAD`, "--", dir], {
  encoding: "utf8",
})

const changed = output
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.split("\t"))
  .filter(([status]) => !status.startsWith("A")) // only additions are allowed

if (changed.length > 0) {
  console.error("✖ Applied migrations must never be edited, renamed or deleted (policy DB-02):")
  for (const [status, ...paths] of changed) console.error(`  ${status}  ${paths.join(" -> ")}`)
  console.error("Fix the problem with a new migration instead: pnpm supabase migration new <name>")
  process.exit(1)
}
console.log("✓ No existing migrations were changed.")
