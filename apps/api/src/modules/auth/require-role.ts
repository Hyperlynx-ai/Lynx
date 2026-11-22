import type { SupabaseClient } from "@supabase/supabase-js"
import type { FastifyReply, FastifyRequest } from "fastify"

export type AppRole = "candidate" | "recruiter" | "admin"

/**
 * preHandler that runs after `requireUser`: answers 403 unless the caller's
 * profile has `role`. The role is read from the database on every request,
 * so a revoked admin loses access immediately.
 */
export function makeRequireRole(supabaseAdmin: SupabaseClient | undefined) {
  return (role: AppRole) =>
    async function requireRole(request: FastifyRequest, reply: FastifyReply) {
      if (!supabaseAdmin) return reply.code(503).send({ error: "database_not_configured" })
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", request.user!.id)
        .maybeSingle()
      if (error) throw error
      if (data?.role !== role) return reply.code(403).send({ error: "forbidden" })
    }
}
