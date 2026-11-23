import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { CvData } from "../../shared/cv.js"
import {
  CV_SECTIONS,
  getSection,
  guardEdit,
  TAILOR_SECTIONS,
  type CvSection,
} from "../../shared/cv-edit.js"
import { factsFromCv } from "../../shared/facts.js"
import { AiError, AiUsage, type AiClient } from "../ai/client.js"
import type { CandidateStore } from "../candidates/store.js"
import type { FactStore } from "../facts/store.js"
import { CvVersion } from "./routes.js"
import type { CvStore, CvVersionRow } from "./store.js"

const ErrorResponse = z.object({ error: z.string() })
const Section = z.enum(Object.keys(CV_SECTIONS) as [CvSection, ...CvSection[]])

/** One AI proposal for a section: shown as a diff, accepted or rejected. */
const Proposal = z.object({
  section: Section,
  before: z.unknown(),
  after: z.unknown(),
  explanation: z.string(),
  warnings: z.array(z.string()),
})
type Proposal = z.infer<typeof Proposal>

/** What services/ai returns for cv_edit. */
const EditResult = z.object({
  section: z.string(),
  content: z.unknown(),
  explanation: z.string(),
  usage: AiUsage,
})

const toVersion = (row: CvVersionRow): z.infer<typeof CvVersion> => ({
  id: row.id,
  version: row.version,
  source: row.source,
  label: row.label,
  createdAt: row.created_at,
  data: row.data,
})

type EditRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireCandidate: preHandlerHookHandler
  cvStoreFor: (request: FastifyRequest) => CvStore | undefined
  candidateStoreFor: (request: FastifyRequest) => CandidateStore | undefined
  factStoreFor: (request: FastifyRequest) => FactStore | undefined
  aiClient: AiClient | undefined
}

/** The CV editor (chunk 2.5): AI edits, tailoring, versions, the matching CV. */
export const cvEditRoutes: FastifyPluginAsyncZod<EditRoutesOptions> = async (app, options) => {
  const preHandler = [options.requireUser, options.requireCandidate]
  const doc = { tags: ["cvs"], security: [{ bearer: [] }] }

  /** The CV and the version to work on (latest unless given), or a reply. */
  async function load(
    request: FastifyRequest,
    reply: FastifyReply,
    cvId: string,
    version?: number
  ): Promise<{ store: CvStore; current: CvVersionRow } | null> {
    const store = options.cvStoreFor(request)
    if (!store) {
      await reply.code(503).send({ error: "database_not_configured" })
      return null
    }
    const cv = await store.getCv(cvId)
    const current = cv ? await store.getVersion(cv.id, version) : null
    if (!current) {
      await reply.code(404).send({ error: "not_found" })
      return null
    }
    return { store, current }
  }

  /** Asks Lynx to edit one section, then applies the AI-08 guard. */
  async function propose(
    request: FastifyRequest,
    cv: CvData,
    section: CvSection,
    instruction: string,
    targetRole: string | null
  ): Promise<Proposal> {
    const before = getSection(cv, section)
    const result = await options.aiClient!.call(
      "cv_edit",
      "/v1/cv/edit",
      { section, content: before, instruction, target_role: targetRole, cv },
      request.user!.id,
      EditResult
    )
    const { content, warnings } = guardEdit(section, before, result.content, cv)
    return { section, before, after: content, explanation: result.explanation, warnings }
  }

  function aiErrorReply(reply: FastifyReply, error: unknown) {
    if (!(error instanceof AiError)) throw error
    if (error.code === "capped") return reply.code(429).send({ error: "daily_limit" })
    if (error.code === "not_configured") return reply.code(503).send({ error: "ai_not_configured" })
    return reply.code(502).send({ error: "ai_failed" })
  }

  app.post(
    "/cvs/:id/ai-edit",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Ask Lynx to edit one section; returns a proposal (nothing is saved)",
        params: z.object({ id: z.uuid() }),
        body: z.object({
          section: Section,
          instruction: z.string().trim().min(3).max(500),
          version: z.number().int().positive().optional(),
          targetRole: z.string().trim().max(120).optional(),
        }),
        response: {
          200: Proposal,
          403: ErrorResponse,
          404: ErrorResponse,
          429: ErrorResponse,
          502: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const loaded = await load(request, reply, request.params.id, request.body.version)
      if (!loaded) return reply
      if (!options.aiClient) return reply.code(503).send({ error: "ai_not_configured" })
      const { section, instruction, targetRole } = request.body
      try {
        return await propose(request, loaded.current.data, section, instruction, targetRole ?? null)
      } catch (error) {
        return aiErrorReply(reply, error)
      }
    }
  )

  app.post(
    "/cvs/:id/tailor",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Tailor the CV to a role: proposals for the summary, experience and skills",
        params: z.object({ id: z.uuid() }),
        body: z.object({
          role: z.string().trim().min(2).max(120),
          version: z.number().int().positive().optional(),
        }),
        response: {
          200: z.object({
            proposals: z.array(Proposal),
            failed: z.array(z.object({ section: Section, error: z.string() })),
          }),
          403: ErrorResponse,
          404: ErrorResponse,
          429: ErrorResponse,
          502: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const loaded = await load(request, reply, request.params.id, request.body.version)
      if (!loaded) return reply
      if (!options.aiClient) return reply.code(503).send({ error: "ai_not_configured" })
      const { role } = request.body
      const cv = loaded.current.data
      const sections = TAILOR_SECTIONS.filter((s) => {
        const content = getSection(cv, s)
        return Array.isArray(content) ? content.length > 0 : Boolean(content)
      })
      const instruction = `Tailor this section for a "${role}" role: put the most relevant points first, sharpen wording for that role, and drop what's irrelevant. Don't add anything new.`
      // One section at a time: free-tier AI keys refuse parallel requests (KL-20).
      const proposals: Proposal[] = []
      const failed: { section: CvSection; error: string }[] = []
      for (const section of sections) {
        try {
          proposals.push(await propose(request, cv, section, instruction, role))
        } catch (error) {
          if (!(error instanceof AiError)) throw error
          failed.push({ section, error: error.code === "capped" ? "daily_limit" : "ai_failed" })
          if (error.code === "capped") break
        }
      }
      if (!proposals.length && failed.length) {
        const capped = failed.some((f) => f.error === "daily_limit")
        return reply.code(capped ? 429 : 502).send({ error: failed[0]!.error })
      }
      return { proposals, failed }
    }
  )

  app.post(
    "/cvs/:id/versions",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Save edited CV content as a new version",
        params: z.object({ id: z.uuid() }),
        body: z.object({
          data: CvData,
          source: z.enum(["candidate_edit", "ai_edit", "tailored"]),
          label: z.string().trim().max(120).nullable().optional(),
        }),
        response: { 201: CvVersion, 403: ErrorResponse, 404: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = options.cvStoreFor(request)
      if (!store) return reply.code(503).send({ error: "database_not_configured" })
      const cv = await store.getCv(request.params.id)
      if (!cv || cv.status !== "parsed") return reply.code(404).send({ error: "not_found" })
      const { data, source, label } = request.body
      const version = await store.addVersion(cv.id, { source, label: label || null, data })
      return reply.code(201).send(toVersion(version))
    }
  )

  app.put(
    "/me/candidate/matching-cv",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Choose the CV version Lynx uses for matching (and for its CV facts)",
        body: z.object({ cvId: z.uuid(), version: z.number().int().positive() }),
        response: {
          200: z.object({ matchingCvVersionId: z.string() }),
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const loaded = await load(request, reply, request.body.cvId, request.body.version)
      if (!loaded) return reply
      const candidates = options.candidateStoreFor(request)
      if (!candidates) return reply.code(503).send({ error: "database_not_configured" })
      if (!(await candidates.get())) return reply.code(409).send({ error: "profile_required" })
      await candidates.save({ matching_cv_version_id: loaded.current.id })
      await options
        .factStoreFor(request)
        ?.replaceCvFacts(loaded.current.id, factsFromCv(loaded.current.data))
      return { matchingCvVersionId: loaded.current.id }
    }
  )
}
