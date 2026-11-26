import { beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import { CANDIDATE, fakeAdmin, RECRUITER, ROLES, testAuth } from "../../testing/helpers.js"
import type { FeedQuery, FeedRow, MatchState, OpportunityStore } from "./store.js"

const JOB = "7d0f1c4e-8a9b-4c3d-9e2f-1a2b3c4d5e6f"

let auth: Awaited<ReturnType<typeof testAuth>>
beforeAll(async () => {
  auth = await testAuth()
})

const ROW: FeedRow = {
  id: JOB,
  title: "Junior Data Analyst",
  company: "Example Co",
  location: "Dubai, United Arab Emirates",
  country: "AE",
  city: "Dubai",
  remote: false,
  employment_type: "full_time",
  seniority: "entry",
  field: "data_ai",
  posted_at: "2026-11-25T00:00:00Z",
  deadline: null,
  url: "https://example.test/jobs/1",
  is_affiliated: false,
  source_id: "greenhouse",
  source_name: "Greenhouse company boards",
  source_kind: "ats",
  match_rank: 1,
  match_score: 0.72,
  match_label: "strong",
  match_reason: "Your SQL work fits this analyst role.",
  match_reranked: true,
  saved: false,
  total: 41,
}

function memoryStore(state: MatchState | null) {
  const queries: FeedQuery[] = []
  const saves = new Map<string, string>()
  const store: OpportunityStore = {
    async feed(query) {
      queries.push(query)
      return [{ ...ROW, saved: saves.get(JOB) === "saved" }]
    },
    matchState: async () => state,
    async setSaved(jobId, value) {
      if (jobId !== JOB) return false
      if (value) saves.set(jobId, value)
      else saves.delete(jobId)
      return true
    },
  }
  return { store, queries, saves }
}

async function setup(state: MatchState | null = null) {
  const db = memoryStore(state)
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin(ROLES),
    opportunityStoreFor: () => db.store,
  })
  return { app, ...db }
}

describe("opportunities feed", () => {
  it("returns a page of ranked opportunities with the match and source", async () => {
    const { app, queries } = await setup({
      requested_at: null,
      matched_at: "2026-11-27T01:40:00Z",
      matches: 100,
    })
    const res = await app.inject({
      url: "/me/opportunities?view=internships&q=analyst&country=AE&remote=true&page=3",
      headers: await auth.bearer(CANDIDATE),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ total: 41, page: 3, pageSize: 20 })
    expect(body.matching).toEqual({ status: "ready", matchedAt: "2026-11-27T01:40:00Z" })
    expect(body.items[0]).toMatchObject({
      title: "Junior Data Analyst",
      source: { id: "greenhouse", kind: "ats" },
      match: { rank: 1, label: "strong", byAi: true },
      saved: false,
    })
    expect(queries[0]).toEqual({
      view: "internships",
      query: "analyst",
      country: "AE",
      field: undefined,
      remote: true,
      saved: false,
      limit: 20,
      offset: 40,
    })
    await app.close()
  })

  it("says when matches are on the way", async () => {
    const waiting = await setup(null)
    const headers = await auth.bearer(CANDIDATE)
    const res = await waiting.app.inject({ url: "/me/opportunities", headers })
    expect(res.json().matching.status).toBe("waiting")
    await waiting.app.close()

    const updating = await setup({
      requested_at: "2026-11-27T02:00:00Z",
      matched_at: null,
      matches: 0,
    })
    const res2 = await updating.app.inject({ url: "/me/opportunities", headers })
    expect(res2.json().matching.status).toBe("updating")
    await updating.app.close()
  })

  it("rejects unknown filters", async () => {
    const { app } = await setup()
    const headers = await auth.bearer(CANDIDATE)
    for (const query of ["view=everything", "country=XX", "field=astrology", "page=0"]) {
      const res = await app.inject({ url: `/me/opportunities?${query}`, headers })
      expect(res.statusCode, query).toBe(400)
    }
    await app.close()
  })

  it("saves, hides and clears a job", async () => {
    const { app, saves } = await setup()
    const headers = await auth.bearer(CANDIDATE)
    const put = (jobId: string, state: string | null) =>
      app.inject({ method: "PUT", url: `/me/opportunities/${jobId}`, headers, payload: { state } })

    expect((await put(JOB, "saved")).json()).toEqual({ jobId: JOB, state: "saved" })
    expect(saves.get(JOB)).toBe("saved")
    await put(JOB, "hidden")
    expect(saves.get(JOB)).toBe("hidden")
    await put(JOB, null)
    expect(saves.has(JOB)).toBe(false)
    expect((await put(crypto.randomUUID(), "saved")).statusCode).toBe(404)
    expect((await put(JOB, "starred")).statusCode).toBe(400)
    await app.close()
  })

  it("is for candidates only", async () => {
    const { app } = await setup()
    const res = await app.inject({
      url: "/me/opportunities",
      headers: await auth.bearer(RECRUITER),
    })
    expect(res.statusCode).toBe(403)
    await app.close()
  })
})
