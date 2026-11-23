import type { FastifyReply, FastifyRequest } from "fastify"

import type { TokenUser, VerifyToken } from "./verify-token.js"

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `requireUser` for authenticated routes. */
    user?: TokenUser
    /** The verified access token, for Supabase calls made as the user. */
    accessToken?: string
  }
}

/**
 * preHandler for routes that need a signed-in user. Reads
 * `Authorization: Bearer <Supabase access token>`, verifies it and sets
 * `request.user`. Answers 401 otherwise; 503 if auth isn't configured.
 */
export function makeRequireUser(verifyToken: VerifyToken | undefined) {
  return async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    if (!verifyToken) {
      return reply.code(503).send({ error: "auth_not_configured" })
    }
    const header = request.headers.authorization ?? ""
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : ""
    if (!token) return reply.code(401).send({ error: "unauthorized" })
    try {
      request.user = await verifyToken(token)
      request.accessToken = token
    } catch {
      return reply.code(401).send({ error: "unauthorized" })
    }
  }
}
