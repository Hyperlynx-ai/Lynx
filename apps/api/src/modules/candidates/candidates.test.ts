import { beforeAll, describe, expect, it } from "vitest"

import { buildApp } from "../../create-app.js"
import { readEnv } from "../../env.js"
import {
  CANDIDATE,
  fakeAdmin,
  memoryCandidates,
  memoryDb,
  OTHER,
  RECRUITER,
  SAMPLE,
  testAuth,
} from "../../testing/helpers.js"

let auth: Awaited<ReturnType<typeof testAuth>>
beforeAll(async () => {
  auth = await testAuth()
})

const PROFILE = {
  targetRoles: ["Backend Engineer", "Backend Engineer", "Platform Engineer"],
  countries: ["AE", "DE"],
  experienceLevel: "mid",
  educationLevel: "bachelors",
  pathways: ["job_switch"],
  visaStatus: "needs_sponsorship",
  currentLocation: "Bengaluru, India",
  phone: "+91 90000 00001",
  phoneIsWhatsapp: true,
}
const CONSENTS = {
  visibleToRecruiters: true,
  showContactToRecruiters: true,
  jobAlerts: true,
  newsletter: false,
}

async function setup() {
  const candidates = memoryCandidates()
  const cvs = memoryDb()
  const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }), {
    verifyToken: auth.verifyToken,
    supabaseAdmin: fakeAdmin(),
    candidateStoreFor: (request) => candidates.storeFor(request.user!.id),
    cvStoreFor: (request) => cvs.storeFor(request.user!.id),
  })
  return { app, candidates, cvs }
}

describe("onboarding", () => {
  it("suggests values from the latest parsed CV before there is a profile", async () => {
    const { app, cvs } = await setup()
    const store = cvs.storeFor(CANDIDATE)
    const cv = await store.insertCv({
      storage_path: `${CANDIDATE}/abcdefgh12.pdf`,
      file_name: "cv.pdf",
      media_type: "application/pdf",
      size_bytes: 10,
      status: "parsed",
    })
    await store.addVersion(cv.id, { source: "parsed", label: "Original", data: SAMPLE })

    const res = await app.inject({ url: "/me/candidate", headers: await auth.bearer(CANDIDATE) })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      candidate: null,
      suggestions: {
        targetRoles: ["Backend Software Engineer"],
        currentLocation: "Bengaluru, India",
        phone: "+91 90000 00001",
        educationLevel: "bachelors",
      },
    })
    await app.close()
  })

  it("saves the profile, then the consents, and finishes onboarding", async () => {
    const { app, candidates } = await setup()
    const headers = await auth.bearer(CANDIDATE)

    const early = await app.inject({
      method: "PUT",
      url: "/me/candidate/consents",
      headers,
      payload: CONSENTS,
    })
    expect(early.statusCode).toBe(409)

    const profile = await app.inject({
      method: "PUT",
      url: "/me/candidate/profile",
      headers,
      payload: PROFILE,
    })
    expect(profile.statusCode).toBe(200)
    expect(profile.json().targetRoles).toEqual(["Backend Engineer", "Platform Engineer"])
    expect(profile.json().onboardedAt).toBeNull()

    const done = await app.inject({
      method: "PUT",
      url: "/me/candidate/consents",
      headers,
      payload: { ...CONSENTS, completeOnboarding: true },
    })
    expect(done.statusCode).toBe(200)
    expect(done.json()).toMatchObject({ visibleToRecruiters: true, jobAlerts: true })
    expect(done.json().onboardedAt).toEqual(expect.any(String))

    // Every first answer is logged, including the "no" to the newsletter.
    const log = candidates.consents.get(CANDIDATE)!
    expect(log.map((c) => [c.kind, c.granted]).sort()).toEqual([
      ["job_alerts", true],
      ["newsletter", false],
      ["recruiter_contact", true],
      ["recruiter_visibility", true],
    ])
    await app.close()
  })

  it("logs only changes later, and hides contact details with the profile", async () => {
    const { app, candidates } = await setup()
    const headers = await auth.bearer(CANDIDATE)
    await app.inject({ method: "PUT", url: "/me/candidate/profile", headers, payload: PROFILE })
    await app.inject({
      method: "PUT",
      url: "/me/candidate/consents",
      headers,
      payload: { ...CONSENTS, completeOnboarding: true },
    })
    const onboardedAt = candidates.rows.get(CANDIDATE)!.onboarded_at

    const res = await app.inject({
      method: "PUT",
      url: "/me/candidate/consents",
      headers,
      payload: { ...CONSENTS, visibleToRecruiters: false },
    })

    expect(res.json()).toMatchObject({ visibleToRecruiters: false, showContactToRecruiters: false })
    expect(res.json().onboardedAt).toBe(onboardedAt)
    const log = candidates.consents.get(CANDIDATE)!
    expect(log).toHaveLength(6)
    expect(
      log
        .slice(0, 2)
        .map((c) => [c.kind, c.granted])
        .sort()
    ).toEqual([
      ["recruiter_contact", false],
      ["recruiter_visibility", false],
    ])
    await app.close()
  })

  it("validates answers and keeps profiles separate", async () => {
    const { app } = await setup()
    const bad = await app.inject({
      method: "PUT",
      url: "/me/candidate/profile",
      headers: await auth.bearer(CANDIDATE),
      payload: { ...PROFILE, countries: ["XX"] },
    })
    expect(bad.statusCode).toBe(400)

    await app.inject({
      method: "PUT",
      url: "/me/candidate/profile",
      headers: await auth.bearer(CANDIDATE),
      payload: PROFILE,
    })
    const other = await app.inject({ url: "/me/candidate", headers: await auth.bearer(OTHER) })
    expect(other.json().candidate).toBeNull()

    const recruiter = await app.inject({
      url: "/me/candidate",
      headers: await auth.bearer(RECRUITER),
    })
    expect(recruiter.statusCode).toBe(403)
    await app.close()
  })
})
