import type { SupabaseClient } from "@supabase/supabase-js"
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import { beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import { createTokenVerifier } from "../auth/verify-token.js"

const SUPABASE_URL = "https://project.supabase.test"
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"]
let verifyToken: ReturnType<typeof createTokenVerifier>

beforeAll(async () => {
  const pair = await generateKeyPair("ES256")
  privateKey = pair.privateKey
  const jwk = { ...(await exportJWK(pair.publicKey)), alg: "ES256", kid: "test" }
  verifyToken = createTokenVerifier(SUPABASE_URL, createLocalJWKSet({ keys: [jwk] }))
})

const sign = (sub: string) =>
  new SignJWT({ sub })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience("authenticated")
    .setExpirationTime("5m")
    .sign(privateKey)

const ROLES: Record<string, string> = { admin1: "admin", cand1: "candidate", rec1: "recruiter" }

/** Fake admin client: profiles by id, and two auth users (no network, TEST-03). */
function fakeSupabase() {
  const client = {
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => ({ data: ROLES[id] ? { role: ROLES[id] } : null, error: null }),
        }),
        in: async () => ({
          data: [
            { id: "cand1", role: "candidate", full_name: "Test Candidate" },
            { id: "rec1", role: "recruiter", full_name: null },
          ],
          error: null,
        }),
      }),
    }),
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: [
              {
                id: "cand1",
                email: "c@example.test",
                created_at: "2026-11-01T00:00:00Z",
                app_metadata: { provider: "email" },
              },
              {
                id: "rec1",
                email: "r@acme.example",
                created_at: "2026-11-02T00:00:00Z",
                last_sign_in_at: "2026-11-03T00:00:00Z",
                app_metadata: { provider: "google" },
              },
            ],
          },
          error: null,
        }),
      },
    },
  }
  return client as unknown as SupabaseClient
}

async function app() {
  return buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken,
    supabaseAdmin: fakeSupabase(),
  })
}

describe("GET /admin/users", () => {
  it("lists accounts for admins, newest first", async () => {
    const instance = await app()
    const res = await instance.inject({
      url: "/admin/users",
      headers: { authorization: `Bearer ${await sign("admin1")}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.users.map((u: { id: string }) => u.id)).toEqual(["rec1", "cand1"])
    expect(body.users[0]).toMatchObject({ role: "recruiter", provider: "google" })
    expect(body.users[1]).toMatchObject({ fullName: "Test Candidate", lastSignInAt: null })
    await instance.close()
  })

  it("refuses candidates and recruiters", async () => {
    const instance = await app()
    for (const id of ["cand1", "rec1"]) {
      const res = await instance.inject({
        url: "/admin/users",
        headers: { authorization: `Bearer ${await sign(id)}` },
      })
      expect(res.statusCode).toBe(403)
    }
    await instance.close()
  })

  it("refuses anonymous callers", async () => {
    const instance = await app()
    expect((await instance.inject({ url: "/admin/users" })).statusCode).toBe(401)
    await instance.close()
  })
})
