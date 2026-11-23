import type { SupabaseClient } from "@supabase/supabase-js"
import type { preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { AiError, AiUsage, type AiClient } from "../ai/client.js"

const Role = z.enum(["candidate", "recruiter", "admin"])

export const AdminUser = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: Role,
  fullName: z.string().nullable(),
  createdAt: z.string(),
  lastSignInAt: z.string().nullable(),
  provider: z.string().nullable(),
})

const UsersResponse = z.object({
  users: z.array(AdminUser),
  page: z.number(),
  perPage: z.number(),
  hasMore: z.boolean(),
})

const ErrorResponse = z.object({ error: z.string() })

type AdminRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireAdmin: preHandlerHookHandler
  supabaseAdmin: SupabaseClient | undefined
  aiClient: AiClient | undefined
}

/** Admin console endpoints. Every route needs a signed-in admin. */
export const adminRoutes: FastifyPluginAsyncZod<AdminRoutesOptions> = async (
  app,
  { requireUser, requireAdmin, supabaseAdmin, aiClient }
) => {
  app.get(
    "/admin/users",
    {
      preHandler: [requireUser, requireAdmin],
      schema: {
        summary: "List accounts with their role (admin only)",
        tags: ["admin"],
        security: [{ bearer: [] }],
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          perPage: z.coerce.number().int().min(1).max(100).default(50),
        }),
        response: { 200: UsersResponse, 403: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      if (!supabaseAdmin) return reply.code(503).send({ error: "database_not_configured" })
      const { page, perPage } = request.query

      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      const ids = list.users.map((u) => u.id)

      const { data: profiles, error: profileError } = ids.length
        ? await supabaseAdmin.from("profiles").select("id, role, full_name").in("id", ids)
        : { data: [], error: null }
      if (profileError) throw profileError
      const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]))

      const users = list.users
        .map((u) => {
          const profile = byId.get(u.id)
          const parsedRole = Role.safeParse(profile?.role)
          return {
            id: u.id,
            email: u.email ?? null,
            role: parsedRole.success ? parsedRole.data : ("candidate" as const),
            fullName: (profile?.full_name as string | null | undefined) ?? null,
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at ?? null,
            provider: (u.app_metadata?.provider as string | undefined) ?? null,
          }
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

      return { users, page, perPage, hasMore: list.users.length === perPage }
    }
  )

  app.post(
    "/admin/ai/ping",
    {
      preHandler: [requireUser, requireAdmin],
      schema: {
        summary: "Run the AI smoke test through the whole chain (admin only)",
        tags: ["admin"],
        security: [{ bearer: [] }],
        body: z.object({ message: z.string().max(500).optional() }).optional(),
        response: {
          200: z.object({ output: z.string(), usage: AiUsage }),
          429: ErrorResponse,
          502: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      if (!aiClient) return reply.code(503).send({ error: "ai_not_configured" })
      try {
        return await aiClient.call(
          "ping",
          "/v1/ping",
          request.body?.message ? { message: request.body.message } : {},
          request.user!.id,
          z.object({ output: z.string(), usage: AiUsage })
        )
      } catch (error) {
        if (error instanceof AiError) {
          const status = error.code === "capped" ? 429 : error.code === "not_configured" ? 503 : 502
          return reply.code(status).send({ error: error.code })
        }
        throw error
      }
    }
  )

  app.get(
    "/admin/ai/usage",
    {
      preHandler: [requireUser, requireAdmin],
      schema: {
        summary: "AI calls in the last 24 hours, by task (admin only)",
        tags: ["admin"],
        security: [{ bearer: [] }],
        response: {
          200: z.object({
            since: z.string(),
            tasks: z.array(
              z.object({
                task: z.string(),
                calls: z.number(),
                errors: z.number(),
                capped: z.number(),
                inputTokens: z.number(),
                outputTokens: z.number(),
                costUsd: z.number(),
              })
            ),
          }),
          503: ErrorResponse,
        },
      },
    },
    async (_request, reply) => {
      if (!supabaseAdmin) return reply.code(503).send({ error: "database_not_configured" })
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from("ai_calls")
        .select("task, status, input_tokens, output_tokens, cost_usd")
        .gte("created_at", since)
        .limit(10_000)
      if (error) throw error
      const byTask = new Map<
        string,
        {
          task: string
          calls: number
          errors: number
          capped: number
          inputTokens: number
          outputTokens: number
          costUsd: number
        }
      >()
      for (const row of data ?? []) {
        const task = String(row.task)
        const entry = byTask.get(task) ?? {
          task,
          calls: 0,
          errors: 0,
          capped: 0,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        }
        if (row.status === "ok") entry.calls += 1
        if (row.status === "error") entry.errors += 1
        if (row.status === "capped") entry.capped += 1
        entry.inputTokens += Number(row.input_tokens ?? 0)
        entry.outputTokens += Number(row.output_tokens ?? 0)
        entry.costUsd += Number(row.cost_usd ?? 0)
        byTask.set(task, entry)
      }
      return { since, tasks: [...byTask.values()].sort((a, b) => a.task.localeCompare(b.task)) }
    }
  )
}
