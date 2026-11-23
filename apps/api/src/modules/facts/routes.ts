import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { FactCategorySchema, FactInput, TellLynxInput } from "../../shared/facts.js"
import { AiError, AiUsage, type AiClient } from "../ai/client.js"
import type { FactRow, FactStore } from "./store.js"

/** Most facts one candidate can have (keeps the page and matching sane). */
export const MAX_FACTS = 500

const ErrorResponse = z.object({ error: z.string() })

export const Fact = z.object({
  id: z.string(),
  category: z.string(),
  text: z.string(),
  source: z.enum(["cv", "interview", "chat", "candidate"]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const toFact = (row: FactRow): z.infer<typeof Fact> => ({
  id: row.id,
  category: row.category,
  text: row.text,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/** What services/ai returns for facts_extract. */
const ExtractResult = z.object({
  facts: z.array(z.object({ category: FactCategorySchema, text: z.string().min(1).max(300) })),
  usage: AiUsage,
})

type FactRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireCandidate: preHandlerHookHandler
  factStoreFor: (request: FastifyRequest) => FactStore | undefined
  aiClient: AiClient | undefined
}

/** "What Lynx knows about you": list, add, edit, delete, and "Tell Lynx more" (2.4). */
export const factRoutes: FastifyPluginAsyncZod<FactRoutesOptions> = async (
  app,
  { requireUser, requireCandidate, factStoreFor, aiClient }
) => {
  const preHandler = [requireUser, requireCandidate]
  const doc = { tags: ["facts"], security: [{ bearer: [] }] }

  function storeOr503(request: FastifyRequest, reply: FastifyReply) {
    const store = factStoreFor(request)
    if (!store) void reply.code(503).send({ error: "database_not_configured" })
    return store
  }

  app.get(
    "/me/facts",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Everything Lynx knows about the candidate, with sources",
        response: {
          200: z.object({ facts: z.array(Fact) }),
          403: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      return { facts: (await store.list()).map(toFact) }
    }
  )

  app.post(
    "/me/facts",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Add a fact (source: the candidate)",
        body: FactInput,
        response: { 201: Fact, 403: ErrorResponse, 409: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      if ((await store.count()) >= MAX_FACTS) {
        return reply.code(409).send({ error: "too_many_facts" })
      }
      const [row] = await store.add([{ ...request.body, source: "candidate" }])
      return reply.code(201).send(toFact(row!))
    }
  )

  app.patch(
    "/me/facts/:id",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Correct a fact (it becomes the candidate's own)",
        params: z.object({ id: z.uuid() }),
        body: FactInput,
        response: { 200: Fact, 403: ErrorResponse, 404: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const row = await store.update(request.params.id, request.body)
      if (!row) return reply.code(404).send({ error: "not_found" })
      return toFact(row)
    }
  )

  app.delete(
    "/me/facts/:id",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Delete a fact",
        params: z.object({ id: z.uuid() }),
        response: { 204: z.null(), 403: ErrorResponse, 404: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      if (!(await store.remove(request.params.id))) {
        return reply.code(404).send({ error: "not_found" })
      }
      return reply.code(204).send(null)
    }
  )

  app.post(
    "/me/facts/tell",
    {
      preHandler,
      schema: {
        ...doc,
        summary: "Tell Lynx more: free text becomes facts (AI task facts_extract)",
        body: TellLynxInput,
        response: {
          201: z.object({ facts: z.array(Fact) }),
          403: ErrorResponse,
          409: ErrorResponse,
          429: ErrorResponse,
          502: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      if (!aiClient) return reply.code(503).send({ error: "ai_not_configured" })
      const existing = await store.count()
      if (existing >= MAX_FACTS) return reply.code(409).send({ error: "too_many_facts" })

      let result: z.infer<typeof ExtractResult>
      try {
        result = await aiClient.call(
          "facts_extract",
          "/v1/facts/extract",
          { text: request.body.text },
          request.user!.id,
          ExtractResult
        )
      } catch (error) {
        if (!(error instanceof AiError)) throw error
        if (error.code === "capped") return reply.code(429).send({ error: "daily_limit" })
        if (error.code === "not_configured") {
          return reply.code(503).send({ error: "ai_not_configured" })
        }
        return reply.code(502).send({ error: "ai_failed" })
      }
      const rows = await store.add(
        result.facts
          .slice(0, MAX_FACTS - existing)
          .map((f) => ({ category: f.category, text: f.text, source: "candidate" as const }))
      )
      return reply.code(201).send({ facts: rows.map(toFact) })
    }
  )
}
