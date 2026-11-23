import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import { createTokenVerifier } from "../auth/verify-token.js"

const SUPABASE_URL = "https://project.supabase.test"
const USER_ID = "11111111-1111-1111-1111-111111111111"

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"]
let verifyToken: ReturnType<typeof createTokenVerifier>

beforeAll(async () => {
  const pair = await generateKeyPair("ES256")
  privateKey = pair.privateKey
  const jwk = { ...(await exportJWK(pair.publicKey)), alg: "ES256", kid: "test" }
  verifyToken = createTokenVerifier(SUPABASE_URL, createLocalJWKSet({ keys: [jwk] }))
})

function sign(claims: { sub?: string; email?: string }, issuer = `${SUPABASE_URL}/auth/v1`) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setIssuer(issuer)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey)
}

/** A tiny stand-in for the Supabase admin client (no network in tests, TEST-03). */
function fakeSupabase(profile: Record<string, unknown> | null) {
  const deleteUser = vi.fn(async () => ({ data: {}, error: null }))
  // One stored CV file in the user's folder.
  let files = [{ name: "abcdefgh12.pdf" }]
  const removeFiles = vi.fn(async (paths: string[]) => {
    files = files.filter((f) => !paths.includes(`${USER_ID}/${f.name}`))
    return { data: [], error: null }
  })
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }),
    }),
    auth: { admin: { deleteUser } },
    storage: {
      from: () => ({
        list: async () => ({ data: files, error: null }),
        remove: removeFiles,
      }),
    },
  }
  return { client: client as unknown as SupabaseClient, deleteUser, removeFiles }
}

async function app(
  profile: Record<string, unknown> | null = { role: "candidate", full_name: "Test Candidate" }
) {
  const supabase = fakeSupabase(profile)
  const instance = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken,
    supabaseAdmin: supabase.client,
  })
  return { instance, deleteUser: supabase.deleteUser, removeFiles: supabase.removeFiles }
}

describe("GET /me", () => {
  it("returns the signed-in user's profile", async () => {
    const { instance } = await app()
    const token = await sign({ sub: USER_ID, email: "candidate@example.test" })
    const res = await instance.inject({ url: "/me", headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      id: USER_ID,
      email: "candidate@example.test",
      role: "candidate",
      fullName: "Test Candidate",
    })
    await instance.close()
  })

  it("rejects requests without a token", async () => {
    const { instance } = await app()
    expect((await instance.inject({ url: "/me" })).statusCode).toBe(401)
    await instance.close()
  })

  it("rejects tokens from another issuer", async () => {
    const { instance } = await app()
    const token = await sign({ sub: USER_ID }, "https://evil.example/auth/v1")
    const res = await instance.inject({ url: "/me", headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(401)
    await instance.close()
  })

  it("answers 404 when the profile is missing", async () => {
    const { instance } = await app(null)
    const token = await sign({ sub: USER_ID })
    const res = await instance.inject({ url: "/me", headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(404)
    await instance.close()
  })
})

describe("DELETE /me", () => {
  it("deletes only the caller's own account", async () => {
    const { instance, deleteUser, removeFiles } = await app()
    const token = await sign({ sub: USER_ID })
    const res = await instance.inject({
      method: "DELETE",
      url: "/me",
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
    expect(deleteUser).toHaveBeenCalledWith(USER_ID)
    expect(removeFiles).toHaveBeenCalledWith([`${USER_ID}/abcdefgh12.pdf`])
    await instance.close()
  })

  it("does nothing without a valid token", async () => {
    const { instance, deleteUser } = await app()
    const res = await instance.inject({
      method: "DELETE",
      url: "/me",
      headers: { authorization: "Bearer not-a-token" },
    })
    expect(res.statusCode).toBe(401)
    expect(deleteUser).not.toHaveBeenCalled()
    await instance.close()
  })
})
