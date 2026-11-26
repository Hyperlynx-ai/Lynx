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

type EditBody = { section: string; content: unknown }

/** cv_parse answers with the sample; cv_edit with `edit(section, content)`. */
function fakeAi(edit: (body: EditBody) => unknown) {
  const call = vi.fn(async (task: string, _path: string, body: unknown) => {
    if (task === "cv_parse") return { is_cv: true, cv: SAMPLE, usage: usage("cv_parse") }
    const b = body as EditBody
    return {
      section: b.section,
      content: edit(b),
      explanation: "Sharper wording.",
      usage: usage("cv_edit"),
    }
  })
  return { client: { usedToday: async () => 0, call } as unknown as AiClient, call }
}

async function setup(edit: (body: EditBody) => unknown = (b) => b.content) {
  const cvs = memoryDb()
  const facts = memoryFacts()
  const candidates = memoryCandidates()
  const ai = fakeAi(edit)
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin(),
    aiClient: ai.client,
    cvStoreFor: (r) => cvs.storeFor(r.user!.id),
    factStoreFor: (r) => facts.storeFor(r.user!.id),
    candidateStoreFor: (r) => candidates.storeFor(r.user!.id),
  })
  // A candidate with a profile and a parsed CV.
  await candidates.storeFor(CANDIDATE).save({ target_roles: ["Backend Engineer"] })
  const path = `${CANDIDATE}/abcdefgh12.pdf`
  cvs.files.add(path)
  const parsed = await app.inject({
    method: "POST",
    url: "/cvs",
    headers: await auth.bearer(CANDIDATE),
    payload: { path, fileName: "cv.pdf", mediaType: "application/pdf", sizeBytes: 100 },
  })
  const cvId = parsed.json().cv.id as string
  return { app, cvs, facts, candidates, ai, cvId, versionId: parsed.json().version.id as string }
}

describe("CV editor", () => {
  it("a newly read CV becomes the matching CV", async () => {
    const ctx = await setup()
    expect(ctx.candidates.rows.get(CANDIDATE)!.matching_cv_version_id).toBe(ctx.versionId)
    await ctx.app.close()
  })

  it("returns a guarded proposal for one section and saves nothing", async () => {
    const ctx = await setup((b) =>
      b.section === "skills" ? [{ name: "Languages", skills: ["Go", "Rust"] }] : b.content
    )
    const res = await ctx.app.inject({
      method: "POST",
      url: `/cvs/${ctx.cvId}/ai-edit`,
      headers: await auth.bearer(CANDIDATE),
      payload: { section: "skills", instruction: "Only backend languages" },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      section: "skills",
      after: [{ name: "Languages", skills: ["Go"] }],
      explanation: "Sharper wording.",
      warnings: ["Left out skills that aren't in your CV: Rust."],
    })
    expect(res.json().before).toEqual(SAMPLE.skills)
    expect(ctx.cvs.versions).toHaveLength(1)
    await ctx.app.close()
  })

  it("tailors the summary, experience and skills, reporting sections that failed", async () => {
    const ctx = await setup((b) => {
      if (b.section === "skills") throw new AiError("failed", "boom")
      return b.section === "summary" ? "Backend engineer for payments." : b.content
    })
    const res = await ctx.app.inject({
      method: "POST",
      url: `/cvs/${ctx.cvId}/tailor`,
      headers: await auth.bearer(CANDIDATE),
      payload: { role: "Payments Engineer" },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().proposals.map((p: { section: string }) => p.section)).toEqual([
      "summary",
      "experience",
    ])
    expect(res.json().failed).toEqual([{ section: "skills", error: "ai_failed" }])
    const editCalls = ctx.ai.call.mock.calls.filter((c) => c[0] === "cv_edit")
    expect(editCalls[0]![2]).toMatchObject({ target_role: "Payments Engineer" })
    await ctx.app.close()
  })

  it("saves edits as a new version and validates them", async () => {
    const ctx = await setup()
    const headers = await auth.bearer(CANDIDATE)
    const edited = { ...SAMPLE, basics: { ...SAMPLE.basics, headline: "Senior Backend Engineer" } }
    const res = await ctx.app.inject({
      method: "POST",
      url: `/cvs/${ctx.cvId}/versions`,
      headers,
      payload: { data: edited, source: "ai_edit", label: "Sharper headline" },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ version: 2, source: "ai_edit", label: "Sharper headline" })

    const bad = await ctx.app.inject({
      method: "POST",
      url: `/cvs/${ctx.cvId}/versions`,
      headers,
      payload: { data: { basics: {} }, source: "candidate_edit" },
    })
    expect(bad.statusCode).toBe(400)

    const theirs = await ctx.app.inject({
      method: "POST",
      url: `/cvs/${ctx.cvId}/versions`,
      headers: await auth.bearer(OTHER),
      payload: { data: edited, source: "candidate_edit" },
    })
    expect(theirs.statusCode).toBe(404)
    await ctx.app.close()
  })

  it("chooses the matching version and refreshes Lynx's CV facts from it", async () => {
    const ctx = await setup()
    const headers = await auth.bearer(CANDIDATE)
    const edited = { ...SAMPLE, skills: [{ name: null, skills: ["Go"] }] }
    const saved = await ctx.app.inject({
      method: "POST",
      url: `/cvs/${ctx.cvId}/versions`,
      headers,
      payload: { data: edited, source: "candidate_edit" },
    })
    const res = await ctx.app.inject({
      method: "PUT",
      url: "/me/candidate/matching-cv",
      headers,
      payload: { cvId: ctx.cvId, version: 2 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().matchingCvVersionId).toBe(saved.json().id)
    const skills = ctx.facts.rows.filter((f) => f.category === "skill").map((f) => f.text)
    expect(skills).toEqual(["Go"])
    await ctx.app.close()
  })
})
