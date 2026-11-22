#!/usr/bin/env node
/**
 * Runs after `drizzle-kit pull`:
 * 1. Tables that reference Supabase's auth.users get Drizzle's built-in
 *    `authUsers` definition imported (we only pull the public schema).
 * 2. Drizzle's own migration files are removed: migrations are SQL files in
 *    supabase/migrations (policy DB-01), never Drizzle migrations.
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dirname, "..", "src", "generated")

const schemaPath = join(dir, "schema.ts")
let schema = readFileSync(schemaPath, "utf8")
if (schema.includes("[users.id]") && !schema.includes("drizzle-orm/supabase")) {
  const header = [
    'import { authUsers } from "drizzle-orm/supabase"',
    "",
    "/** Supabase's auth.users table: not pulled, defined by drizzle-orm. */",
    "export const usersInAuth = authUsers",
    "const users = authUsers",
    "",
  ].join("\n")
  schema = `${header}\n${schema}`
  writeFileSync(schemaPath, schema)
}

for (const entry of readdirSync(dir)) {
  if (entry.endsWith(".sql")) rmSync(join(dir, entry))
}
if (existsSync(join(dir, "meta"))) rmSync(join(dir, "meta"), { recursive: true })

console.log("@lynx/db: schema ready in src/generated/")
