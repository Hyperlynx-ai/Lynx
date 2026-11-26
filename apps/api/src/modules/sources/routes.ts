import type { preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import type { DispatchRun } from "./dispatch.js"
import type { RunRow, SourceRow, SourceStore } from "./store.js"

const ErrorResponse = z.object({ error: z.string() })

const Source = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["curated", "api", "ats", "scraper"]),
  enabled: z.boolean(),
  notes: z.string().nullable(),
  runRequestedAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  lastStatus: z.enum(["ok", "failed", "partial"]).nullable(),
  lastError: z.string().nullable(),
  activeJobs: z.number(),
})

const Run = z.object({
  id: z.number(),
  sourceId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  status: z.enum(["running", "ok", "failed", "partial"]),
  fetched: z.number(),
  kept: z.number(),
  inserted: z.number(),
  updated: z.number(),
  expired: z.number(),
  error: z.string().nullable(),
})

const toSource = (row: SourceRow): z.infer<typeof Source> => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  enabled: row.enabled,
  notes: row.notes,
  runRequestedAt: row.run_requested_at,
  lastRunAt: row.last_run_at,
  lastStatus: row.last_status,
  lastError: row.last_error,
  activeJobs: row.active_jobs,
})

const toRun = (row: RunRow): z.infer<typeof Run> => ({
  id: row.id,
  sourceId: row.source_id,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  status: row.status,
  fetched: row.fetched,
  kept: row.kept,
  inserted: row.inserted,
  updated: row.updated,
  expired: row.expired,
  error: row.error,
})

type SourceRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireAdmin: preHandlerHookHandler
  sourceStore: SourceStore | undefined
  dispatchRun?: DispatchRun | undefined
}

/** Admin console: job sources with switches, "run now" and health (chunk 3.1). */
export const sourceRoutes: FastifyPluginAsyncZod<SourceRoutesOptions> = async (
  app,
  { requireUser, requireAdmin, sourceStore, dispatchRun }
) => {
  const preHandler = [requireUser, requireAdmin]
  const doc = { tags: ["admin"], security: [{ bearer: [] }] }
  const Id = z.object({ id: z.string().regex(/^[a-z0-9_]{2,40}$/) })

  app.get(
    "/admin/sources",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Job sources, their health, recent runs and the active job count",
        response: {
          200: z.object({
            sources: z.array(Source),
            runs: z.array(Run),
            activeJobs: z.number(),
          }),
          403: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (_request, reply) => {
      if (!sourceStore) return reply.code(503).send({ error: "database_not_configured" })
      const [sources, runs, activeJobs] = await Promise.all([
        sourceStore.list(),
        sourceStore.recentRuns(30),
        sourceStore.activeJobsTotal(),
      ])
      return { sources: sources.map(toSource), runs: runs.map(toRun), activeJobs }
    }
  )

  app.patch(
    "/admin/sources/:id",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Switch a source on or off",
        params: Id,
        body: z.object({ enabled: z.boolean() }),
        response: {
          200: z.object({ id: z.string(), enabled: z.boolean() }),
          403: ErrorResponse,
          404: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      if (!sourceStore) return reply.code(503).send({ error: "database_not_configured" })
      const { id } = request.params
      if (!(await sourceStore.setEnabled(id, request.body.enabled))) {
        return reply.code(404).send({ error: "not_found" })
      }
      request.log.info({ source: id, enabled: request.body.enabled }, "job source switched")
      return { id, enabled: request.body.enabled }
    }
  )

  app.post(
    "/admin/sources/:id/run",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Ask for a run of this source (started now if dispatch is set up, else hourly)",
        params: Id,
        response: {
          202: z.object({
            id: z.string(),
            requested: z.literal(true),
            /** The workflow was started now (false: the hourly run picks it up). */
            started: z.boolean(),
          }),
          403: ErrorResponse,
          404: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      if (!sourceStore) return reply.code(503).send({ error: "database_not_configured" })
      if (!(await sourceStore.requestRun(request.params.id))) {
        return reply.code(404).send({ error: "not_found" })
      }
      let started = false
      if (dispatchRun) {
        try {
          started = await dispatchRun()
        } catch (error) {
          request.log.warn({ err: error }, "couldn't start the ingestion workflow")
        }
        if (!started) request.log.warn("ingestion workflow not started; hourly run will pick up")
      }
      return reply.code(202).send({ id: request.params.id, requested: true as const, started })
    }
  )
}
