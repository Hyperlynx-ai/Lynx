#!/usr/bin/env node
/**
 * Git hook guard (run by lefthook): blocks committing on `main` and pushing to
 * `main` (policy GIT-01). Works on Windows and macOS.
 *
 *   node scripts/git-guard.mjs commit   pre-commit: refuse when the current branch is main
 *   node scripts/git-guard.mjs push     pre-push: refuse when any pushed ref targets main
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const PROTECTED = new Set(["main"])
const mode = process.argv[2]

function fail(message) {
  console.error(`\n✖ ${message}`)
  console.error("  main is production. Work on a branch and open a pull request:")
  console.error("    git switch -c feat/<short-name>")
  console.error("  See docs/policies/01-git-workflow.md\n")
  process.exit(1)
}

if (mode === "commit") {
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
  }).trim()
  if (PROTECTED.has(branch)) fail(`Committing directly to '${branch}' is not allowed.`)
} else if (mode === "push") {
  // Git passes "<local ref> <local sha> <remote ref> <remote sha>" lines on stdin.
  let input = ""
  try {
    input = readFileSync(0, "utf8")
  } catch {
    input = ""
  }
  for (const line of input.split(/\r?\n/)) {
    const remoteRef = line.trim().split(/\s+/)[2]
    const branch = remoteRef?.replace(/^refs\/heads\//, "")
    if (branch && PROTECTED.has(branch)) fail(`Pushing to '${branch}' is not allowed.`)
  }
} else {
  console.error("usage: node scripts/git-guard.mjs <commit|push>")
  process.exit(2)
}
