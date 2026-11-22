#!/usr/bin/env node
/**
 * Installs the git hooks (lefthook) after `pnpm install`, but only on a
 * developer machine: skipped in CI, on Vercel, and outside a git checkout.
 */
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const skip = process.env.CI || process.env.VERCEL || !existsSync(join(root, ".git"))

if (skip) {
  console.log("lefthook: skipped (CI, Vercel or no .git)")
} else {
  execFileSync("lefthook", ["install"], { stdio: "inherit", shell: process.platform === "win32" })
}
