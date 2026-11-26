import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import {
  CandidateConsentsInput,
  CandidateProfileInput,
  CONSENT_TEXT_VERSION,
  educationLevelFromDegrees,
  EducationLevel,
} from "../../shared/candidate.js"
import type { CvStore } from "../cvs/store.js"
import type { CandidateRow, CandidateStore, ConsentKind } from "./store.js"
import type { DispatchRun } from "../sources/dispatch.js"

const ErrorResponse = z.object({ error: z.string() })

export const Candidate = z.object({
  targetRoles: z.array(z.string()),
  countries: z.array(z.string()),
  experienceLevel: z.string().nullable(),
  educationLevel: z.string().nullable(),
  pathways: z.array(z.string()),
  visaStatus: z.string().nullable(),
  currentLocation: z.string().nullable(),
  phone: z.string().nullable(),
  phoneIsWhatsapp: z.boolean(),
  visibleToRecruiters: z.boolean(),
  showContactToRecruiters: z.boolean(),
  jobAlerts: z.boolean(),
  newsletter: z.boolean(),
  matchingCvVersionId: z.string().nullable(),
  onboardedAt: z.string().nullable(),
})

/** Values to prefill onboarding with, read from the latest parsed CV. */
const Suggestions = z.object({
  targetRoles: z.array(z.string()),
  currentLocation: z.string().nullable(),
  phone: z.string().nullable(),
  educationLevel: EducationLevel.nullable(),
})

export function toCandidate(row: CandidateRow): z.infer<typeof Candidate> {
  return {
    targetRoles: row.target_roles,
    countries: row.countries,
    experienceLevel: row.experience_level,
    educationLevel: row.education_level,
    pathways: row.pathways,
    visaStatus: row.visa_status,
    currentLocation: row.current_location,
    phone: row.phone,
    phoneIsWhatsapp: row.phone_is_whatsapp,
    visibleToRecruiters: row.visible_to_recruiters,
    showContactToRecruiters: row.show_contact_to_recruiters,
    jobAlerts: row.job_alerts,
    newsletter: row.newsletter,
    matchingCvVersionId: row.matching_cv_version_id,
    onboardedAt: row.onboarded_at,
  }
}

type CandidateRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireCandidate: preHandlerHookHandler
  candidateStoreFor: (request: FastifyRequest) => CandidateStore | undefined
  cvStoreFor: (request: FastifyRequest) => CvStore | undefined
  /** Starts the jobs workflow so new matches come within minutes (optional). */
  dispatchRun?: DispatchRun | undefined
}

/** The signed-in candidate's profile and consents (onboarding, chunk 2.3). */
export const candidateRoutes: FastifyPluginAsyncZod<CandidateRoutesOptions> = async (
  app,
  { requireUser, requireCandidate, candidateStoreFor, cvStoreFor, dispatchRun }
) => {
  const preHandler = [requireUser, requireCandidate]

  /**
   * The database marks the candidate's matches as requested when their
   * matching inputs change; this starts the workflow that recomputes them.
   * Never fails the request (the hourly run is the fallback).
   */
  async function refreshMatches(request: FastifyRequest) {
    if (!dispatchRun) return
    try {
      if (!(await dispatchRun())) request.log.warn("matching workflow not started")
    } catch (error) {
      request.log.warn({ err: error }, "couldn't start the matching workflow")
    }
  }
  const doc = { tags: ["candidate"], security: [{ bearer: [] }] }

  function storeOr503(request: FastifyRequest, reply: FastifyReply) {
    const store = candidateStoreFor(request)
    if (!store) void reply.code(503).send({ error: "database_not_configured" })
    return store
  }

  /** Prefill values from the newest parsed CV (empty if there is none). */
  async function suggestions(request: FastifyRequest): Promise<z.infer<typeof Suggestions>> {
    const empty = { targetRoles: [], currentLocation: null, phone: null, educationLevel: null }
    const cvs = cvStoreFor(request)
    if (!cvs) return empty
    const latest = (await cvs.listCvs()).find((cv) => cv.status === "parsed")
    const version = latest ? await cvs.getVersion(latest.id) : null
    if (!version) return empty
    const { basics, education } = version.data
    return {
      targetRoles: basics.headline ? [basics.headline.slice(0, 80)] : [],
      currentLocation: basics.location?.slice(0, 120) ?? null,
      phone: basics.phone?.slice(0, 20) ?? null,
      educationLevel: educationLevelFromDegrees(education.map((e) => e.degree)),
    }
  }

  app.get(
    "/me/candidate",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "The candidate's profile (null before onboarding) and prefill suggestions",
        response: {
          200: z.object({ candidate: Candidate.nullable(), suggestions: Suggestions }),
          403: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const row = await store.get()
      return {
        candidate: row ? toCandidate(row) : null,
        suggestions: await suggestions(request),
      }
    }
  )

  app.put(
    "/me/candidate/profile",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Save the candidate's profile answers (onboarding step 2, or later edits)",
        body: CandidateProfileInput,
        response: { 200: Candidate, 403: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const p = request.body
      const row = await store.save({
        target_roles: [...new Set(p.targetRoles)],
        countries: [...new Set(p.countries)],
        experience_level: p.experienceLevel,
        education_level: p.educationLevel,
        pathways: [...new Set(p.pathways)],
        visa_status: p.visaStatus,
        current_location: p.currentLocation || null,
        phone: p.phone || null,
        phone_is_whatsapp: Boolean(p.phone) && p.phoneIsWhatsapp,
      })
      if (row.onboarded_at) await refreshMatches(request)
      return toCandidate(row)
    }
  )

  app.put(
    "/me/candidate/consents",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Save what the candidate agrees to; logs every change (policy PRIV-03)",
        body: CandidateConsentsInput.extend({
          /** Set by the last onboarding step: marks onboarding as done. */
          completeOnboarding: z.boolean().default(false),
        }),
        response: { 200: Candidate, 403: ErrorResponse, 409: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const current = await store.get()
      if (!current) return reply.code(409).send({ error: "profile_required" })

      const body = request.body
      // Contact details are only shown with a visible profile.
      const next: Record<ConsentKind, boolean> = {
        recruiter_visibility: body.visibleToRecruiters,
        recruiter_contact: body.visibleToRecruiters && body.showContactToRecruiters,
        job_alerts: body.jobAlerts,
        newsletter: body.newsletter,
      }
      const previous: Record<ConsentKind, boolean> = {
        recruiter_visibility: current.visible_to_recruiters,
        recruiter_contact: current.show_contact_to_recruiters,
        job_alerts: current.job_alerts,
        newsletter: current.newsletter,
      }
      // Log every answer the first time (also the "no"s), then only changes.
      const first = current.onboarded_at === null
      const changed = (Object.keys(next) as ConsentKind[]).filter(
        (kind) => first || next[kind] !== previous[kind]
      )
      await store.addConsents(
        changed.map((kind) => ({
          kind,
          granted: next[kind],
          text_version: CONSENT_TEXT_VERSION,
        }))
      )
      const row = await store.save({
        visible_to_recruiters: next.recruiter_visibility,
        show_contact_to_recruiters: next.recruiter_contact,
        job_alerts: next.job_alerts,
        newsletter: next.newsletter,
        ...(body.completeOnboarding && first ? { onboarded_at: new Date().toISOString() } : {}),
      })
      if (body.completeOnboarding && first) await refreshMatches(request)
      return toCandidate(row)
    }
  )
}
