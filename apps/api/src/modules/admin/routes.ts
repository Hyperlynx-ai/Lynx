import type { SupabaseClient } from "@supabase/supabase-js"
import type { preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

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
}

/** Admin console endpoints. Every route needs a signed-in admin. */
export const adminRoutes: FastifyPluginAsyncZod<AdminRoutesOptions> = async (
  app,
  { requireUser, requireAdmin, supabaseAdmin }
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
}
