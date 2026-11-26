#!/usr/bin/env node
/**
 * Copies shared TypeScript that apps/api needs at runtime from packages/shared
 * into apps/api/src/shared/.
 *
 * Why: Vercel compiles apps/api file by file and renames .ts to .js, but a
 * workspace package's `exports` still point at .ts, so importing
 * `@lynx/shared/...` crashes the deployed API (KL-19). The web app, tests and
 * local tools handle the package fine; only the API needs the copy.
 *
 *   pnpm shared:sync                      write the copies
 *   node scripts/shared-sync.mjs --check  exit 1 if a copy is out of date (CI)
 *
 * Edit only packages/shared/src/*. The copies are overwritten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const checkOnly = process.argv.includes("--check")

/** Files from packages/shared/src that apps/api uses. They may import each other. */
const FILES = ["cv.ts", "candidate.ts", "facts.ts", "cv-edit.ts", "jobs.ts"]

let stale = 0
for (const file of FILES) {
  const source = join(root, "packages", "shared", "src", file)
  const target = join(root, "apps", "api", "src", "shared", file)
  // Relative imports may only point at other copied files. The API needs
  // explicit .js extensions (NodeNext), so "./cv" becomes "./cv.js".
  const body = readFileSync(source, "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/(from\s+["'])\.\/([\w-]+)(["'])/g, (_match, open, name, close) => {
      if (!FILES.includes(`${name}.ts`)) {
        console.error(`✖ packages/shared/src/${file} imports ./${name}, which isn't in FILES.`)
        process.exit(1)
      }
      return `${open}./${name}.js${close}`
    })
  if (/from\s+["']\.\.\//.test(body)) {
    console.error(`✖ packages/shared/src/${file} imports from outside packages/shared/src.`)
    process.exit(1)
  }
  const content =
    `// GENERATED from packages/shared/src/${file} by scripts/shared-sync.mjs.\n` +
    `// Do not edit: change the original and run \`pnpm shared:sync\`.\n\n${body}`
  const current = existsSync(target) ? readFileSync(target, "utf8").replace(/\r\n/g, "\n") : null
  if (current === content) continue
  stale++
  if (checkOnly) {
    console.error(`✖ apps/api/src/shared/${file} is out of date. Run: pnpm shared:sync`)
  } else {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
    console.log(`✓ apps/api/src/shared/${file}`)
  }
}

if (checkOnly && stale) process.exit(1)
if (checkOnly) console.log("Shared copies are in sync.")
