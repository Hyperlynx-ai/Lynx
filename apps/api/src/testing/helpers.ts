/**
 * Test helpers for apps/api: signed test tokens, a fake admin client for
 * roles, and in-memory stores that behave like row-level security.
 * Never imported by app code (not shipped).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { SupabaseClient } from "@supabase/supabase-js"
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"

import { createTokenVerifier, type VerifyToken } from "../modules/auth/verify-token.js"
import type { CandidateRow, CandidateStore, ConsentRow } from "../modules/candidates/store.js"
import type { CvRow, CvStore, CvVersionRow } from "../modules/cvs/store.js"
import { CvData } from "../shared/cv.js"

export const SUPABASE_URL = "https://project.supabase.test"
export const CANDIDATE = "11111111-1111-1111-1111-111111111111"
export const OTHER = "22222222-2222-2222-2222-222222222222"
export const RECRUITER = "33333333-3333-3333-3333-333333333333"
export const ROLES: Record<string, string> = {
  [CANDIDATE]: "candidate",
  [OTHER]: "candidate",
  [RECRUITER]: "recruiter",
}
export const PDF = "application/pdf"
export const SAMPLE = CvData.parse(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../../packages/shared/fixtures/cv-sample.json"),
      "utf8"
    )
  )
)

/** Usage block as services/ai reports it. */
export const usage = (task: string) => ({
  task,
  model: "test",
  input_tokens: 1,
  output_tokens: 1,
  latency_ms: 1,
  cost_usd: null,
})

/** A local key pair standing in for Supabase's signing keys. */
export async function testAuth() {
  const pair = await generateKeyPair("ES256")
  const jwk = { ...(await exportJWK(pair.publicKey)), alg: "ES256", kid: "test" }
  const verifyToken: VerifyToken = createTokenVerifier(
    SUPABASE_URL,
    createLocalJWKSet({ keys: [jwk] })
  )
  const bearer = async (sub: string) => ({
    authorization: `Bearer ${await new SignJWT({ sub })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .setIssuer(`${SUPABASE_URL}/auth/v1`)
      .setAudience("authenticated")
      .setExpirationTime("5m")
      .sign(pair.privateKey)}`,
  })
  return { verifyToken, bearer }
}

/** Admin client that only answers role lookups (profiles.role by id). */
export function fakeAdmin(roles: Record<string, string> = ROLES) {
  const client = {
    from: () => ({
      select: () => ({
        eq: (_: string, id: string) => ({
          maybeSingle: async () => ({ data: roles[id] ? { role: roles[id] } : null, error: null }),
        }),
      }),
    }),
  }
  return client as unknown as SupabaseClient
}

/** In-memory database and storage with row-level-security-like ownership. */
export function memoryDb() {
  const files = new Set<string>()
  const cvs = new Map<string, CvRow>()
  const versions: CvVersionRow[] = []
  let n = 0
  const now = () => new Date(Date.UTC(2026, 10, 23, 0, 0, n++)).toISOString()
  const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`

  function storeFor(userId: string): CvStore {
    const own = (id: string) => {
      const cv = cvs.get(id)
      return cv && cv.user_id === userId ? cv : null
    }
    return {
      async signedUrl(path) {
        return files.has(path) && path.startsWith(`${userId}/`)
          ? `https://x.supabase.co/storage/v1/object/sign/cvs/${path}?token=t`
          : null
      },
      async removeFile(path) {
        files.delete(path)
      },
      async insertCv(input) {
        if ([...cvs.values()].some((c) => c.storage_path === input.storage_path)) {
          throw Object.assign(new Error("duplicate"), { code: "23505" })
        }
        const row: CvRow = {
          ...input,
          id: uuid(),
          user_id: userId,
          created_at: now(),
          updated_at: now(),
        }
        cvs.set(row.id, row)
        return row
      },
      async listCvs() {
        return [...cvs.values()].filter((c) => c.user_id === userId).reverse()
      },
      async getCv(id) {
        return own(id)
      },
      async setStatus(id, status) {
        const cv = own(id)
        if (cv) cv.status = status
      },
      async deleteCv(id) {
        if (own(id)) cvs.delete(id)
      },
      async listVersions(cvId) {
        return versions.filter((v) => v.cv_id === cvId && own(cvId)).reverse()
      },
      async getVersion(cvId, version) {
        const mine = versions.filter((v) => v.cv_id === cvId && own(cvId))
        return version === undefined
          ? (mine.at(-1) ?? null)
          : (mine.find((v) => v.version === version) ?? null)
      },
      async addVersion(cvId, input) {
        const row: CvVersionRow = {
          ...input,
          id: uuid(),
          cv_id: cvId,
          version: versions.filter((v) => v.cv_id === cvId).length + 1,
          created_at: now(),
        }
        versions.push(row)
        return row
      },
    }
  }
  return { files, cvs, versions, storeFor }
}

/** In-memory candidate profiles and consents, per user. */
export function memoryCandidates() {
  const rows = new Map<string, CandidateRow>()
  const consents = new Map<string, ConsentRow[]>()
  function storeFor(userId: string): CandidateStore {
    return {
      async get() {
        return rows.get(userId) ?? null
      },
      async save(fields) {
        const now = new Date().toISOString()
        const base: CandidateRow = rows.get(userId) ?? {
          user_id: userId,
          target_roles: [],
          countries: [],
          experience_level: null,
          education_level: null,
          pathways: [],
          visa_status: null,
          current_location: null,
          phone: null,
          phone_is_whatsapp: false,
          visible_to_recruiters: false,
          show_contact_to_recruiters: false,
          job_alerts: false,
          newsletter: false,
          matching_cv_version_id: null,
          onboarded_at: null,
          created_at: now,
          updated_at: now,
        }
        const row = { ...base, ...fields, updated_at: now }
        rows.set(userId, row)
        return row
      },
      async addConsents(list) {
        const mine = consents.get(userId) ?? []
        mine.unshift(...list.map((c) => ({ ...c, created_at: new Date().toISOString() })))
        consents.set(userId, mine)
      },
      async listConsents() {
        return consents.get(userId) ?? []
      },
    }
  }
  return { rows, consents, storeFor }
}
