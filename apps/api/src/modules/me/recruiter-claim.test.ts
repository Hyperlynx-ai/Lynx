import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import { CLAIM_WINDOW_MS, claimRecruiterRole } from "./recruiter-claim.js"

const NOW = Date.parse("2026-11-22T12:00:00Z")
const USER = { id: "u1", email: "hr@acme-recruiting.example" }

/** Minimal stand-in for the Supabase admin client (no network, TEST-03). */
function fake(profile: { role: string; created_at: string } | null, isFree = false) {
  const update = vi.fn(() => ({ eq: async () => ({ error: null }) }))
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }),
      update,
    }),
    rpc: vi.fn(async () => ({ data: isFree, error: null })),
  }
  return { client: client as unknown as SupabaseClient, update }
}

const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()

describe("claimRecruiterRole", () => {
  it("upgrades a brand-new account with a work email", async () => {
    const { client, update } = fake({ role: "candidate", created_at: minutesAgo(1) })
    expect(await claimRecruiterRole(client, USER, NOW)).toBeNull()
    expect(update).toHaveBeenCalledWith({ role: "recruiter" })
  })

  it("refuses personal email addresses and says the account is new", async () => {
    const { client, update } = fake({ role: "candidate", created_at: minutesAgo(1) }, true)
    expect(await claimRecruiterRole(client, { ...USER, email: "me@gmail.com" }, NOW)).toEqual({
      status: 422,
      error: "work_email_required",
      newAccount: true,
    })
    expect(update).not.toHaveBeenCalled()
  })

  it("never converts an existing candidate account", async () => {
    const old = minutesAgo(CLAIM_WINDOW_MS / 60_000 + 1)
    const { client, update } = fake({ role: "candidate", created_at: old })
    expect(await claimRecruiterRole(client, USER, NOW)).toMatchObject({
      status: 409,
      error: "existing_account",
    })
    expect(update).not.toHaveBeenCalled()
  })

  it("is a no-op for recruiters and refuses admins", async () => {
    expect(
      await claimRecruiterRole(
        fake({ role: "recruiter", created_at: minutesAgo(99) }).client,
        USER,
        NOW
      )
    ).toBeNull()
    expect(
      await claimRecruiterRole(fake({ role: "admin", created_at: minutesAgo(1) }).client, USER, NOW)
    ).toMatchObject({ error: "not_allowed" })
  })
})
