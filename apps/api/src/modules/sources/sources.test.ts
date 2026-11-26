import { beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import { CANDIDATE, fakeAdmin, ROLES, testAuth } from "../../testing/helpers.js"
import type { RunRow, SourceRow, SourceStore } from "./store.js"

const ADMIN = "44444444-4444-4444-4444-444444444444"

let auth: Awaited<ReturnType<typeof testAuth>>
beforeAll(async () => {
  auth = await testAuth()
})

function memorySources() {
  const sources: SourceRow[] = [
    {
      id: "arbeitnow",
      name: "Arbeitnow",
      kind: "api",
      enabled: false,
      notes: "Free public API",
      run_requested_at: null,
      last_run_at: "2026-11-26T01:30:00Z",
      last_status: "ok",
      last_error: null,
      active_jobs: 120,
    },
  ]
  const runs: RunRow[] = [
    {
      id: 1,
      source_id: "arbeitnow",
      started_at: "2026-11-26T01:30:00Z",
      finished_at: "2026-11-26T01:31:00Z",
      status: "ok",
      fetched: 150,
      kept: 120,
      inserted: 120,
      updated: 0,
      expired: 0,
      error: null,
    },
  ]
  const find = (id: string) => sources.find((s) => s.id === id)
  const store: SourceStore = {
    list: async () => sources,
    recentRuns: async () => runs,
    activeJobsTotal: async () => 120,
    async setEnabled(id, enabled) {
      const source = find(id)
      if (source) source.enabled = enabled
      return Boolean(source)
    },
    async requestRun(id) {
      const source = find(id)
      if (source) source.run_requested_at = new Date().toISOString()
      return Boolean(source)
    },
  }
  return { sources, store }
}

async function setup() {
  const db = memorySources()
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin({ ...ROLES, [ADMIN]: "admin" }),
    sourceStore: db.store,
  })
  return { app, db }
}

describe("admin job sources", () => {
  it("lists sources with health, recent runs and the active job count", async () => {
    const { app } = await setup()
    const res = await app.inject({ url: "/admin/sources", headers: await auth.bearer(ADMIN) })
    expect(res.statusCode).toBe(200)
    expect(res.json().sources[0]).toMatchObject({
      id: "arbeitnow",
      enabled: false,
      lastStatus: "ok",
      activeJobs: 120,
    })
    expect(res.json().runs[0]).toMatchObject({ sourceId: "arbeitnow", inserted: 120 })
    expect(res.json().activeJobs).toBe(120)
    await app.close()
  })

  it("switches a source on and asks for a run", async () => {
    const { app, db } = await setup()
    const headers = await auth.bearer(ADMIN)
    const on = await app.inject({
      method: "PATCH",
      url: "/admin/sources/arbeitnow",
      headers,
      payload: { enabled: true },
    })
    expect(on.json()).toEqual({ id: "arbeitnow", enabled: true })
    const run = await app.inject({ method: "POST", url: "/admin/sources/arbeitnow/run", headers })
    expect(run.statusCode).toBe(202)
    expect(db.sources[0]!.run_requested_at).not.toBeNull()

    const missing = await app.inject({ method: "POST", url: "/admin/sources/nope/run", headers })
    expect(missing.statusCode).toBe(404)
    const bad = await app.inject({ method: "POST", url: "/admin/sources/Bad%20Id/run", headers })
    expect(bad.statusCode).toBe(400)
    await app.close()
  })

  it("is for admins only", async () => {
    const { app } = await setup()
    const res = await app.inject({ url: "/admin/sources", headers: await auth.bearer(CANDIDATE) })
    expect(res.statusCode).toBe(403)
    await app.close()
  })
})
