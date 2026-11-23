import { beforeAll, describe, expect, it, vi } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import {
  CANDIDATE,
  fakeAdmin,
  memoryDb,
  OTHER,
  PDF,
  RECRUITER,
  SAMPLE,
  testAuth,
  usage,
} from "../../testing/helpers.js"
import { AiError, type AiClient } from "../ai/client.js"
import { isOwnUploadPath } from "./routes.js"

let auth: Awaited<ReturnType<typeof testAuth>>
const bearer = (sub: string) => auth.bearer(sub)
const USAGE = usage("cv_parse")

beforeAll(async () => {
  auth = await testAuth()
})

async function setup(
  answer: () => Promise<unknown> = async () => ({
    is_cv: true,
    cv: SAMPLE,
    usage: USAGE,
  })
) {
  const db = memoryDb()
  const call = vi.fn(answer)
  const aiClient = { usedToday: async () => 0, call } as unknown as AiClient
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin(),
    aiClient,
    cvStoreFor: (request) => db.storeFor(request.user!.id),
  })
  return { app, db, call }
}

const upload = (db: ReturnType<typeof memoryDb>, userId = CANDIDATE, name = "abcdefgh12.pdf") => {
  const path = `${userId}/${name}`
  db.files.add(path)
  return { path, fileName: "My CV.pdf", mediaType: PDF, sizeBytes: 1234 }
}

describe("POST /cvs", () => {
  it("parses an uploaded CV with Lynx and saves it as version 1", async () => {
    const { app, db, call } = await setup()
    const res = await app.inject({
      method: "POST",
      url: "/cvs",
      headers: await bearer(CANDIDATE),
      payload: upload(db),
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.cv).toMatchObject({ fileName: "My CV.pdf", status: "parsed" })
    expect(body.version).toMatchObject({ version: 1, source: "parsed", label: "Original" })
    expect(body.version.data).toEqual(SAMPLE)
    expect(call).toHaveBeenCalledWith(
      "cv_parse",
      "/v1/cv/parse",
      {
        file_url: expect.stringContaining("/storage/v1/object/sign/cvs/"),
        media_type: PDF,
      },
      CANDIDATE,
      expect.anything()
    )
    expect([...db.cvs.values()][0]!.status).toBe("parsed")
    await app.close()
  })

  it("only accepts files in the caller's own folder, with a matching type", async () => {
    const { app, db, call } = await setup()
    const headers = await bearer(CANDIDATE)
    const someoneElses = upload(db, OTHER)
    const wrongType = { ...upload(db), mediaType: "image/png" }
    const wrongExtension = {
      ...upload(db, CANDIDATE, "abcdefgh12.docx"),
      mediaType: PDF,
    }
    for (const payload of [someoneElses, wrongType, wrongExtension]) {
      const res = await app.inject({ method: "POST", url: "/cvs", headers, payload })
      expect(res.statusCode).toBe(400)
    }
    expect(call).not.toHaveBeenCalled()
    await app.close()
  })

  it("reports a file that was never uploaded", async () => {
    const { app, call } = await setup()
    const res = await app.inject({
      method: "POST",
      url: "/cvs",
      headers: await bearer(CANDIDATE),
      payload: {
        path: `${CANDIDATE}/missing123.pdf`,
        fileName: "x.pdf",
        mediaType: PDF,
        sizeBytes: 9,
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe("file_not_found")
    expect(call).not.toHaveBeenCalled()
    await app.close()
  })

  it("says so when the document isn't a CV", async () => {
    const { app, db } = await setup(async () => ({
      is_cv: false,
      cv: { ...SAMPLE, experience: [] },
      usage: USAGE,
    }))
    const res = await app.inject({
      method: "POST",
      url: "/cvs",
      headers: await bearer(CANDIDATE),
      payload: upload(db),
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe("not_a_cv")
    expect([...db.cvs.values()][0]!.status).toBe("not_a_cv")
    expect(db.versions).toHaveLength(0)
    await app.close()
  })

  it("keeps the file for a retry when the daily limit is reached", async () => {
    let capped = true
    const { app, db } = await setup(async () => {
      if (capped) throw new AiError("capped", "limit")
      return { is_cv: true, cv: SAMPLE, usage: USAGE }
    })
    const headers = await bearer(CANDIDATE)
    const first = await app.inject({ method: "POST", url: "/cvs", headers, payload: upload(db) })
    expect(first.statusCode).toBe(429)
    const cvId = first.json().cvId as string
    expect(db.cvs.get(cvId)!.status).toBe("uploaded")

    capped = false
    const retry = await app.inject({ method: "POST", url: `/cvs/${cvId}/parse`, headers })
    expect(retry.statusCode).toBe(201)
    expect(db.cvs.get(cvId)!.status).toBe("parsed")

    const again = await app.inject({ method: "POST", url: `/cvs/${cvId}/parse`, headers })
    expect(again.statusCode).toBe(409)
    await app.close()
  })

  it("marks the CV failed when the AI fails", async () => {
    const { app, db } = await setup(async () => {
      throw new AiError("failed", "boom")
    })
    const res = await app.inject({
      method: "POST",
      url: "/cvs",
      headers: await bearer(CANDIDATE),
      payload: upload(db),
    })
    expect(res.statusCode).toBe(502)
    expect([...db.cvs.values()][0]!.status).toBe("failed")
    await app.close()
  })

  it("is for candidates only", async () => {
    const { app, db } = await setup()
    const recruiter = await app.inject({
      method: "POST",
      url: "/cvs",
      headers: await bearer(RECRUITER),
      payload: upload(db, RECRUITER),
    })
    expect(recruiter.statusCode).toBe(403)
    const anonymous = await app.inject({ method: "POST", url: "/cvs", payload: upload(db) })
    expect(anonymous.statusCode).toBe(401)
    await app.close()
  })
})

describe("reading and deleting CVs", () => {
  it("lists CVs and returns versions with the latest content", async () => {
    const { app, db } = await setup()
    const headers = await bearer(CANDIDATE)
    const created = await app.inject({ method: "POST", url: "/cvs", headers, payload: upload(db) })
    const cvId = created.json().cv.id as string

    const list = await app.inject({ url: "/cvs", headers })
    expect(list.json().cvs).toEqual([expect.objectContaining({ id: cvId, status: "parsed" })])

    const one = await app.inject({ url: `/cvs/${cvId}`, headers })
    expect(one.statusCode).toBe(200)
    expect(one.json().versions).toEqual([expect.objectContaining({ version: 1 })])
    expect(one.json().current.data.basics.name).toBe("Aarav Sharma")

    const missing = await app.inject({ url: `/cvs/${cvId}?version=9`, headers })
    expect(missing.statusCode).toBe(404)
    await app.close()
  })

  it("hides other candidates' CVs and deletes the file with the CV", async () => {
    const { app, db } = await setup()
    const mine = await bearer(CANDIDATE)
    const payload = upload(db)
    const created = await app.inject({ method: "POST", url: "/cvs", headers: mine, payload })
    const cvId = created.json().cv.id as string

    const theirs = await bearer(OTHER)
    expect((await app.inject({ url: `/cvs/${cvId}`, headers: theirs })).statusCode).toBe(404)
    const stolen = await app.inject({ method: "DELETE", url: `/cvs/${cvId}`, headers: theirs })
    expect(stolen.statusCode).toBe(404)

    const deleted = await app.inject({ method: "DELETE", url: `/cvs/${cvId}`, headers: mine })
    expect(deleted.statusCode).toBe(204)
    expect(db.files.has(payload.path)).toBe(false)
    expect(db.cvs.size).toBe(0)
    await app.close()
  })
})

describe("isOwnUploadPath", () => {
  it("accepts only <user id>/<random name>.<extension for the type>", () => {
    expect(isOwnUploadPath(`${CANDIDATE}/a1b2c3d4e5.pdf`, CANDIDATE, PDF)).toBe(true)
    expect(isOwnUploadPath(`${CANDIDATE}/../${OTHER}/a1b2c3d4e5.pdf`, CANDIDATE, PDF)).toBe(false)
    expect(isOwnUploadPath(`${CANDIDATE}/short.pdf`, CANDIDATE, PDF)).toBe(false)
    expect(isOwnUploadPath(`${CANDIDATE}/a1b2c3d4e5.pdf`, CANDIDATE, "text/html")).toBe(false)
  })
})
