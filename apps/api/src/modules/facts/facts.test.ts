import { beforeAll, describe, expect, it, vi } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import {
  CANDIDATE,
  fakeAdmin,
  memoryCandidates,
  memoryDb,
  memoryFacts,
  OTHER,
  SAMPLE,
  testAuth,
  usage,
} from "../../testing/helpers.js"
import { AiError, type AiClient } from "../ai/client.js"

let auth: Awaited<ReturnType<typeof testAuth>>
beforeAll(async () => {
  auth = await testAuth()
})

/** Answers cv_parse with the sample CV and facts_extract with two facts. */
function fakeAi(
  extract: () => Promise<unknown> = async () => ({
    facts: [
      { category: "goal", text: "Wants to move to Dubai within 6 months" },
      { category: "preference", text: "Prefers day shifts" },
    ],
    usage: usage("facts_extract"),
  })
) {
  const call = vi.fn(async (task: string) =>
    task === "cv_parse" ? { is_cv: true, cv: SAMPLE, usage: usage("cv_parse") } : extract()
  )
  return { client: { usedToday: async () => 0, call } as unknown as AiClient, call }
}

async function setup(ai = fakeAi()) {
  const cvs = memoryDb()
  const facts = memoryFacts()
  const candidates = memoryCandidates()
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin(),
    aiClient: ai.client,
    cvStoreFor: (r) => cvs.storeFor(r.user!.id),
    factStoreFor: (r) => facts.storeFor(r.user!.id),
    candidateStoreFor: (r) => candidates.storeFor(r.user!.id),
  })
  return { app, cvs, facts, ai }
}

async function parseSampleCv(ctx: Awaited<ReturnType<typeof setup>>, userId = CANDIDATE) {
  const path = `${userId}/abcdefgh${Math.floor(Math.random() * 1e6)}.pdf`
  ctx.cvs.files.add(path)
  return ctx.app.inject({
    method: "POST",
    url: "/cvs",
    headers: await auth.bearer(userId),
    payload: { path, fileName: "cv.pdf", mediaType: "application/pdf", sizeBytes: 100 },
  })
}

describe("What Lynx knows", () => {
  it("reads facts from a parsed CV, and a newer CV replaces them", async () => {
    const ctx = await setup()
    expect((await parseSampleCv(ctx)).statusCode).toBe(201)

    const res = await ctx.app.inject({ url: "/me/facts", headers: await auth.bearer(CANDIDATE) })
    const facts = res.json().facts as { category: string; text: string; source: string }[]
    expect(facts.every((f) => f.source === "cv")).toBe(true)
    expect(facts).toContainEqual(
      expect.objectContaining({ category: "skill", text: "Languages: Go, Python, SQL" })
    )

    await parseSampleCv(ctx)
    const again = await ctx.app.inject({ url: "/me/facts", headers: await auth.bearer(CANDIDATE) })
    expect(again.json().facts).toHaveLength(facts.length)
    await ctx.app.close()
  })

  it("lets the candidate add, correct and delete facts; others can't touch them", async () => {
    const ctx = await setup()
    const headers = await auth.bearer(CANDIDATE)
    await parseSampleCv(ctx)
    const cvFact = ctx.facts.rows.find((f) => f.source === "cv")!

    const added = await ctx.app.inject({
      method: "POST",
      url: "/me/facts",
      headers,
      payload: { category: "preference", text: "  Open to night shifts  " },
    })
    expect(added.statusCode).toBe(201)
    expect(added.json()).toMatchObject({ text: "Open to night shifts", source: "candidate" })

    const corrected = await ctx.app.inject({
      method: "PATCH",
      url: `/me/facts/${cvFact.id}`,
      headers,
      payload: { category: "personal", text: "Lives in Pune, India" },
    })
    expect(corrected.json()).toMatchObject({ text: "Lives in Pune, India", source: "candidate" })

    const theirs = await auth.bearer(OTHER)
    const stolen = await ctx.app.inject({
      method: "DELETE",
      url: `/me/facts/${cvFact.id}`,
      headers: theirs,
    })
    expect(stolen.statusCode).toBe(404)

    const deleted = await ctx.app.inject({
      method: "DELETE",
      url: `/me/facts/${cvFact.id}`,
      headers,
    })
    expect(deleted.statusCode).toBe(204)
    expect(ctx.facts.rows.some((f) => f.id === cvFact.id)).toBe(false)

    const invalid = await ctx.app.inject({
      method: "POST",
      url: "/me/facts",
      headers,
      payload: { category: "religion", text: "x" },
    })
    expect(invalid.statusCode).toBe(400)
    await ctx.app.close()
  })

  it("turns 'Tell Lynx more' into the candidate's own facts", async () => {
    const ctx = await setup()
    const res = await ctx.app.inject({
      method: "POST",
      url: "/me/facts/tell",
      headers: await auth.bearer(CANDIDATE),
      payload: { text: "I want to move to Dubai within 6 months and prefer day shifts." },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().facts).toEqual([
      expect.objectContaining({ category: "goal", source: "candidate" }),
      expect.objectContaining({ category: "preference", source: "candidate" }),
    ])
    expect(ctx.ai.call).toHaveBeenCalledWith(
      "facts_extract",
      "/v1/facts/extract",
      { text: "I want to move to Dubai within 6 months and prefer day shifts." },
      CANDIDATE,
      expect.anything()
    )
    await ctx.app.close()
  })

  it("reports the daily limit for 'Tell Lynx more'", async () => {
    const ctx = await setup(
      fakeAi(async () => {
        throw new AiError("capped", "limit")
      })
    )
    const res = await ctx.app.inject({
      method: "POST",
      url: "/me/facts/tell",
      headers: await auth.bearer(CANDIDATE),
      payload: { text: "Something about me." },
    })
    expect(res.statusCode).toBe(429)
    expect(res.json().error).toBe("daily_limit")
    await ctx.app.close()
  })
})

describe("Download my data", () => {
  it("returns everything as a JSON attachment", async () => {
    const ctx = await setup()
    await parseSampleCv(ctx)
    const res = await ctx.app.inject({ url: "/me/export", headers: await auth.bearer(CANDIDATE) })

    expect(res.statusCode).toBe(200)
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="hyperlynx-data-/)
    const data = res.json()
    expect(data.format).toBe("hyperlynx-export-v1")
    expect(data.account).toMatchObject({ id: CANDIDATE, role: "candidate" })
    expect(data.cvs).toHaveLength(1)
    expect(data.cvs[0].versions[0].data.basics.name).toBe("Aarav Sharma")
    expect(data.facts.length).toBeGreaterThan(5)
    await ctx.app.close()
  })
})
