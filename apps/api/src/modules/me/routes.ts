import type { SupabaseClient } from "@supabase/supabase-js"
import type { preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { claimRecruiterRole } from "./recruiter-claim.js"

export const Role = z.enum(["candidate", "recruiter", "admin"])

export const MeResponse = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: Role,
  fullName: z.string().nullable(),
})

const ErrorResponse = z.object({ error: z.string() })

type MeRoutesOptions = {
  requireUser: preHandlerHookHandler
  supabaseAdmin: SupabaseClient | undefined
}

/** The signed-in user's own account. */
export const meRoutes: FastifyPluginAsyncZod<MeRoutesOptions> = async (
  app,
  { requireUser, supabaseAdmin }
) => {
  app.get(
    "/me",
    {
      preHandler: requireUser,
      schema: {
        summary: "The signed-in user's id, email, role and name",
        tags: ["account"],
        security: [{ bearer: [] }],
        response: { 200: MeResponse, 404: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      if (!supabaseAdmin) return reply.code(503).send({ error: "database_not_configured" })
      const user = request.user!
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle()
      if (error) throw error
      if (!data) return reply.code(404).send({ error: "profile_not_found" })
      return {
        id: user.id,
        email: user.email,
        role: Role.parse(data.role),
        fullName: (data.full_name as string | null) ?? null,
      }
    }
  )

  app.delete(
    "/me",
    {
      preHandler: requireUser,
      schema: {
        summary: "Permanently delete the signed-in user's account",
        tags: ["account"],
        security: [{ bearer: [] }],
        response: { 204: z.null(), 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      if (!supabaseAdmin) return reply.code(503).send({ error: "database_not_configured" })
      // Deleting the auth user cascades to profiles and everything owned by it.
      const { error } = await supabaseAdmin.auth.admin.deleteUser(request.user!.id)
      if (error) throw error
      request.log.info({ userId: request.user!.id }, "account deleted")
      return reply.code(204).send(null)
    }
  )

  app.post(
    "/me/recruiter-claim",
    {
      preHandler: requireUser,
      schema: {
        summary: "Turn a just-created Google account into a recruiter account (work email only)",
        tags: ["account"],
        security: [{ bearer: [] }],
        response: {
          200: z.object({ role: z.literal("recruiter") }),
          404: ErrorResponse,
          409: ErrorResponse,
          422: ErrorResponse.extend({ newAccount: z.boolean() }),
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      if (!supabaseAdmin) return reply.code(503).send({ error: "database_not_configured" })
      const result = await claimRecruiterRole(supabaseAdmin, request.user!)
      if (result.ok) return { role: "recruiter" as const }
      if (result.status === 422) {
        return reply.code(422).send({ error: result.error, newAccount: result.newAccount })
      }
      return reply.code(result.status).send({ error: result.error })
    }
  )
}
