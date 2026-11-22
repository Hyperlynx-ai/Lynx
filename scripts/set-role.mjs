#!/usr/bin/env node
/**
 * Sets a user's role (candidate, recruiter or admin) by email.
 * Owner-only: hosted environments need the owner's Supabase CLI login.
 *
 *   pnpm admin:set-role <email> <role>                         local database
 *   pnpm admin:set-role <email> <role> --env staging --yes
 *   pnpm admin:set-role <email> <role> --env production --yes
 *
 * Local uses apps/api/.env.local (SUPABASE_URL, SUPABASE_SECRET_KEY). Hosted
 * environments read the project ref from supabase/config.toml and fetch the
 * secret key with `supabase projects api-keys --reveal` (never printed).
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}
const [email, role] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"))
const env = flag("--env") ?? "local"
const confirmed = args.includes("--yes")

function fail(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

if (!email || !["candidate", "recruiter", "admin"].includes(role)) {
  fail(
    "usage: pnpm admin:set-role <email> <candidate|recruiter|admin> [--env local|staging|production] [--yes]"
  )
}
if (!["local", "staging", "production"].includes(env)) fail(`unknown --env ${env}`)
if (env !== "local" && !confirmed) {
  fail(`This changes a real account on ${env}. Re-run with --yes to confirm.`)
}

function readEnvFile(path) {
  const values = {}
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) values[m[1]] = m[2]
  }
  return values
}

function hostedProject(name) {
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8")
  const m = config.match(
    new RegExp(`\\[remotes\\.${name}\\]\\s*\\nproject_id\\s*=\\s*"([a-z0-9]+)"`)
  )
  if (!m) fail(`no [remotes.${name}] project_id in supabase/config.toml`)
  const ref = m[1]
  const out = execFileSync(
    "pnpm",
    ["-s", "supabase", "projects", "api-keys", "--project-ref", ref, "--reveal", "-o", "json"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    }
  )
  const keys = JSON.parse(out.slice(out.indexOf("[")))
  const secret = keys.find((k) => k.type === "secret")?.api_key
  if (!secret) fail("could not read the secret key (are you logged in with `pnpm supabase login`?)")
  return { url: `https://${ref}.supabase.co`, secret }
}

const target =
  env === "local"
    ? (() => {
        const values = readEnvFile(join(root, "apps", "api", ".env.local"))
        if (!values.SUPABASE_URL || !values.SUPABASE_SECRET_KEY) {
          fail("apps/api/.env.local needs SUPABASE_URL and SUPABASE_SECRET_KEY (see .env.example)")
        }
        return { url: values.SUPABASE_URL, secret: values.SUPABASE_SECRET_KEY }
      })()
    : hostedProject(env === "production" ? "production" : "staging")

const res = await fetch(`${target.url.replace(/\/+$/, "")}/rest/v1/rpc/set_user_role`, {
  method: "POST",
  headers: { apikey: target.secret, "Content-Type": "application/json" },
  body: JSON.stringify({ target_email: email, new_role: role }),
})
if (!res.ok) {
  const body = await res.json().catch(() => ({}))
  fail(body.message ?? `request failed (HTTP ${res.status})`)
}
console.log(`✓ ${email} is now ${role} (${env})`)
