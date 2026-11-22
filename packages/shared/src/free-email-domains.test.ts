import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { emailDomain, FREE_EMAIL_DOMAINS, isFreeEmailDomain } from "./free-email-domains"

describe("isFreeEmailDomain", () => {
  it("recognises personal providers, case-insensitively", () => {
    expect(isFreeEmailDomain("someone@Gmail.com")).toBe(true)
    expect(isFreeEmailDomain("someone@rediffmail.com")).toBe(true)
  })

  it("accepts company domains", () => {
    expect(isFreeEmailDomain("hr@acme-recruiting.example")).toBe(false)
  })

  it("extracts the domain after the last @", () => {
    expect(emailDomain("a@b@Example.ORG ")).toBe("example.org")
    expect(emailDomain("no-at-sign")).toBe("")
  })
})

describe("list matches the database", () => {
  it("is identical to the seed in supabase/migrations", () => {
    const dir = join(import.meta.dirname, "..", "..", "..", "supabase", "migrations")
    const file = readdirSync(dir).find((name) => name.endsWith("_recruiter_work_email.sql"))
    expect(file, "migration with the free email domains").toBeDefined()
    const sql = readFileSync(join(dir, file!), "utf8")
    const seed = sql.slice(sql.indexOf("insert into public.free_email_domains"))
    const domains = [...seed.matchAll(/\('([a-z0-9.-]+)'\)/g)].map((m) => m[1]).sort()
    expect(domains).toEqual([...FREE_EMAIL_DOMAINS].sort())
  })
})
