import type { preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { ATS, type CompanyRow, type CompanyStore } from "./store.js"

const ErrorResponse = z.object({ error: z.string() })

const Company = z.object({
  id: z.string(),
  ats: z.enum(ATS),
  slug: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
})

const toCompany = (row: CompanyRow): z.infer<typeof Company> => ({
  id: row.id,
  ats: row.ats,
  slug: row.slug,
  name: row.name,
  enabled: row.enabled,
  createdAt: row.created_at,
})

type CompanyRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireAdmin: preHandlerHookHandler
  companyStore: CompanyStore | undefined
}

/** Admin console: the company job boards the ATS sources ingest (chunk 3.5). */
export const companyRoutes: FastifyPluginAsyncZod<CompanyRoutesOptions> = async (
  app,
  { requireUser, requireAdmin, companyStore }
) => {
  const preHandler = [requireUser, requireAdmin]
  const doc = { tags: ["admin"], security: [{ bearer: [] }] }
  const Id = z.object({ id: z.uuid() })
  const unavailable = { error: "database_not_configured" }

  app.get(
    "/admin/companies",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Companies whose public job boards are ingested",
        response: {
          200: z.object({ companies: z.array(Company) }),
          403: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (_request, reply) => {
      if (!companyStore) return reply.code(503).send(unavailable)
      return { companies: (await companyStore.list()).map(toCompany) }
    }
  )

  app.post(
    "/admin/companies",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Add a company board (ingested from the next run of its ATS source)",
        body: z.object({
          ats: z.enum(ATS),
          // The board's name in its careers-page URL, e.g. "stripe" in
          // boards.greenhouse.io/stripe.
          slug: z
            .string()
            .trim()
            .regex(/^[A-Za-z0-9_.-]{1,80}$/),
          name: z.string().trim().min(1).max(120),
        }),
        response: {
          201: Company,
          403: ErrorResponse,
          409: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      if (!companyStore) return reply.code(503).send(unavailable)
      const added = await companyStore.add(request.body)
      if (added === "duplicate") return reply.code(409).send({ error: "already_listed" })
      request.log.info({ ats: added.ats, slug: added.slug }, "company board added")
      return reply.code(201).send(toCompany(added))
    }
  )

  app.patch(
    "/admin/companies/:id",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Switch a company board on or off",
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
      if (!companyStore) return reply.code(503).send(unavailable)
      const { id } = request.params
      if (!(await companyStore.setEnabled(id, request.body.enabled))) {
        return reply.code(404).send({ error: "not_found" })
      }
      return { id, enabled: request.body.enabled }
    }
  )

  app.delete(
    "/admin/companies/:id",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Remove a company board (its jobs expire when no run lists them)",
        params: Id,
        response: {
          204: z.null(),
          403: ErrorResponse,
          404: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      if (!companyStore) return reply.code(503).send(unavailable)
      if (!(await companyStore.remove(request.params.id))) {
        return reply.code(404).send({ error: "not_found" })
      }
      request.log.info({ company: request.params.id }, "company board removed")
      return reply.code(204).send(null)
    }
  )
}
