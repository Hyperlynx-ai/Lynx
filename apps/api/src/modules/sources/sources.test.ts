import { beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import { CANDIDATE, fakeAdmin, ROLES, testAuth } from "../../testing/helpers.js"
import { createWorkflowDispatcher } from "./dispatch.js"
import type { CompanyRow, CompanyStore, RunRow, SourceRow, SourceStore } from "./store.js"

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

async function setup(dispatchRun?: () => Promise<boolean>) {
  const db = memorySources()
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin({ ...ROLES, [ADMIN]: "admin" }),
    sourceStore: db.store,
    dispatchRun,
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
    expect(run.json()).toEqual({ id: "arbeitnow", requested: true, started: false })
    expect(db.sources[0]!.run_requested_at).not.toBeNull()

    const missing = await app.inject({ method: "POST", url: "/admin/sources/nope/run", headers })
    expect(missing.statusCode).toBe(404)
    const bad = await app.inject({ method: "POST", url: "/admin/sources/Bad%20Id/run", headers })
    expect(bad.statusCode).toBe(400)
    await app.close()
  })

  it("starts the ingestion workflow when dispatch is set up", async () => {
    let calls = 0
    const { app } = await setup(async () => ++calls > 0)
    const headers = await auth.bearer(ADMIN)
    const run = await app.inject({ method: "POST", url: "/admin/sources/arbeitnow/run", headers })
    expect(run.json()).toMatchObject({ requested: true, started: true })
    expect(calls).toBe(1)
    await app.close()

    // A failing dispatch still records the request (the hourly run picks it up).
    const failing = await setup(async () => {
      throw new Error("network down")
    })
    const res = await failing.app.inject({
      method: "POST",
      url: "/admin/sources/arbeitnow/run",
      headers,
    })
    expect(res.statusCode).toBe(202)
    expect(res.json().started).toBe(false)
    await failing.app.close()
  })

  it("dispatches the workflow for requested sources on main", async () => {
    let sent: { url: string; init: RequestInit } | undefined
    const dispatch = createWorkflowDispatcher({
      token: "test-token",
      repository: "acme/lynx",
      target: "staging",
      fetchImpl: async (url, init) => {
        sent = { url: String(url), init: init! }
        return new Response(null, { status: 204 })
      },
    })
    expect(await dispatch()).toBe(true)
    expect(sent!.url).toBe(
      "https://api.github.com/repos/acme/lynx/actions/workflows/jobs-ingest.yml/dispatches"
    )
    expect(JSON.parse(String(sent!.init.body))).toEqual({
      ref: "main",
      inputs: { target: "staging", sources: "requested" },
    })
  })

  it("is for admins only", async () => {
    const { app } = await setup()
    const res = await app.inject({ url: "/admin/sources", headers: await auth.bearer(CANDIDATE) })
    expect(res.statusCode).toBe(403)
    await app.close()
  })
})

function memoryCompanies() {
  const companies: CompanyRow[] = [
    {
      id: "5d0f1c4e-8a9b-4c3d-9e2f-1a2b3c4d5e6f",
      ats: "greenhouse",
      slug: "acme",
      name: "Acme",
      enabled: true,
      created_at: "2026-11-27T00:00:00Z",
    },
  ]
  const store: CompanyStore = {
    list: async () => companies,
    async add(company) {
      if (companies.some((c) => c.ats === company.ats && c.slug === company.slug)) {
        return "duplicate"
      }
      const row: CompanyRow = {
        ...company,
        id: crypto.randomUUID(),
        enabled: true,
        created_at: new Date().toISOString(),
      }
      companies.push(row)
      return row
    },
    async setEnabled(id, enabled) {
      const company = companies.find((c) => c.id === id)
      if (company) company.enabled = enabled
      return Boolean(company)
    },
    async remove(id) {
      const index = companies.findIndex((c) => c.id === id)
      if (index >= 0) companies.splice(index, 1)
      return index >= 0
    },
  }
  return { companies, store }
}

describe("admin company boards", () => {
  async function companiesApp() {
    const db = memoryCompanies()
    const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
      verifyToken: auth.verifyToken,
      supabaseAdmin: fakeAdmin({ ...ROLES, [ADMIN]: "admin" }),
      companyStore: db.store,
    })
    return { app, db }
  }

  it("lists, adds, switches and removes company boards", async () => {
    const { app, db } = await companiesApp()
    const headers = await auth.bearer(ADMIN)
    const list = await app.inject({ url: "/admin/companies", headers })
    expect(list.json().companies[0]).toMatchObject({ ats: "greenhouse", slug: "acme" })

    const added = await app.inject({
      method: "POST",
      url: "/admin/companies",
      headers,
      payload: { ats: "lever", slug: " globex ", name: "Globex" },
    })
    expect(added.statusCode).toBe(201)
    expect(added.json()).toMatchObject({ ats: "lever", slug: "globex", enabled: true })
    const again = await app.inject({
      method: "POST",
      url: "/admin/companies",
      headers,
      payload: { ats: "lever", slug: "globex", name: "Globex" },
    })
    expect(again.statusCode).toBe(409)
    const bad = await app.inject({
      method: "POST",
      url: "/admin/companies",
      headers,
      payload: { ats: "workday", slug: "x/../y", name: "" },
    })
    expect(bad.statusCode).toBe(400)

    const id = added.json().id as string
    const off = await app.inject({
      method: "PATCH",
      url: `/admin/companies/${id}`,
      headers,
      payload: { enabled: false },
    })
    expect(off.json()).toEqual({ id, enabled: false })
    const removed = await app.inject({ method: "DELETE", url: `/admin/companies/${id}`, headers })
    expect(removed.statusCode).toBe(204)
    expect(db.companies.map((c) => c.slug)).toEqual(["acme"])
    const gone = await app.inject({ method: "DELETE", url: `/admin/companies/${id}`, headers })
    expect(gone.statusCode).toBe(404)
    await app.close()
  })

  it("is for admins only", async () => {
    const { app } = await companiesApp()
    const res = await app.inject({ url: "/admin/companies", headers: await auth.bearer(CANDIDATE) })
    expect(res.statusCode).toBe(403)
    await app.close()
  })
})
