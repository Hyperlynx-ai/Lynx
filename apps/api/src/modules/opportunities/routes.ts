import type { FastifyRequest, preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { CountryCode } from "../../shared/candidate.js"
import { FeedView, FieldOfWork, MatchLabel, SaveState } from "../../shared/jobs.js"
import type { FeedRow, MatchState, OpportunityStore } from "./store.js"

const ErrorResponse = z.object({ error: z.string() })

export const PAGE_SIZE = 20

const Opportunity = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  remote: z.boolean(),
  employmentType: z.string().nullable(),
  seniority: z.string().nullable(),
  field: z.string().nullable(),
  postedAt: z.string().nullable(),
  deadline: z.string().nullable(),
  /** Where to read and apply (the source's own page). */
  url: z.string(),
  isAffiliated: z.boolean(),
  source: z.object({ id: z.string(), name: z.string(), kind: z.string() }),
  /** Lynx's ranking for this candidate, if the job is among their matches. */
  match: z
    .object({
      rank: z.number(),
      score: z.number(),
      label: MatchLabel.nullable(),
      reason: z.string().nullable(),
      /** The reason was written by the AI (else it's a template). */
      byAi: z.boolean(),
    })
    .nullable(),
  saved: z.boolean(),
})

const Matching = z.object({
  /** waiting: never matched yet; updating: new matches on the way; ready. */
  status: z.enum(["waiting", "updating", "ready"]),
  matchedAt: z.string().nullable(),
})

const toOpportunity = (row: FeedRow): z.infer<typeof Opportunity> => ({
  id: row.id,
  title: row.title,
  company: row.company,
  location: row.location,
  country: row.country,
  city: row.city,
  remote: row.remote,
  employmentType: row.employment_type,
  seniority: row.seniority,
  field: row.field,
  postedAt: row.posted_at,
  deadline: row.deadline,
  url: row.url,
  isAffiliated: row.is_affiliated,
  source: { id: row.source_id, name: row.source_name, kind: row.source_kind },
  match:
    row.match_rank === null
      ? null
      : {
          rank: row.match_rank,
          score: row.match_score ?? 0,
          label: MatchLabel.safeParse(row.match_label).data ?? null,
          reason: row.match_reason,
          byAi: Boolean(row.match_reranked),
        },
  saved: row.saved,
})

const toMatching = (state: MatchState | null): z.infer<typeof Matching> => ({
  status: state?.requested_at ? "updating" : state?.matched_at ? "ready" : "waiting",
  matchedAt: state?.matched_at ?? null,
})

/** "true" / "1" from a query string. */
const flag = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1")

type OpportunityRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireCandidate: preHandlerHookHandler
  opportunityStoreFor: (request: FastifyRequest) => OpportunityStore | undefined
}

/** The candidate's opportunities feed: ranked matches, filters, save and hide (chunk 3.8). */
export const opportunityRoutes: FastifyPluginAsyncZod<OpportunityRoutesOptions> = async (
  app,
  { requireUser, requireCandidate, opportunityStoreFor }
) => {
  const preHandler = [requireUser, requireCandidate]
  const doc = { tags: ["candidate"], security: [{ bearer: [] }] }
  const unavailable = { error: "database_not_configured" }

  app.get(
    "/me/opportunities",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "One page of the opportunities feed (ranked matches first)",
        querystring: z.object({
          view: FeedView.default("jobs"),
          q: z.string().trim().max(80).optional(),
          country: CountryCode.optional(),
          field: FieldOfWork.optional(),
          remote: flag,
          saved: flag,
          page: z.coerce.number().int().min(1).max(100).default(1),
        }),
        response: {
          200: z.object({
            items: z.array(Opportunity),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
            matching: Matching,
          }),
          403: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = opportunityStoreFor(request)
      if (!store) return reply.code(503).send(unavailable)
      const { view, q, country, field, remote, saved, page } = request.query
      const [rows, state] = await Promise.all([
        store.feed({
          view,
          query: q || undefined,
          country,
          field,
          remote,
          saved,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        store.matchState(),
      ])
      return {
        items: rows.map(toOpportunity),
        total: rows[0] ? Number(rows[0].total) : 0,
        page,
        pageSize: PAGE_SIZE,
        matching: toMatching(state),
      }
    }
  )

  app.put(
    "/me/opportunities/:jobId",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Save or hide a job (null clears it)",
        params: z.object({ jobId: z.uuid() }),
        body: z.object({ state: SaveState.nullable() }),
        response: {
          200: z.object({ jobId: z.string(), state: SaveState.nullable() }),
          403: ErrorResponse,
          404: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = opportunityStoreFor(request)
      if (!store) return reply.code(503).send(unavailable)
      const { jobId } = request.params
      if (!(await store.setSaved(jobId, request.body.state))) {
        return reply.code(404).send({ error: "not_found" })
      }
      return { jobId, state: request.body.state }
    }
  )
}
