import type { SupabaseClient } from "@supabase/supabase-js"
import type { FastifyRequest, preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { toCandidate } from "../candidates/routes.js"
import type { CandidateStore } from "../candidates/store.js"
import type { CvStore } from "../cvs/store.js"
import { toFact } from "../facts/routes.js"
import type { FactStore } from "../facts/store.js"

const ErrorResponse = z.object({ error: z.string() })

const ExportResponse = z.object({
  format: z.literal("hyperlynx-export-v1"),
  exportedAt: z.string(),
  account: z.object({
    id: z.string(),
    email: z.string().nullable(),
    role: z.string().nullable(),
    fullName: z.string().nullable(),
  }),
  candidate: z.unknown(),
  consents: z.array(z.unknown()),
  cvs: z.array(z.unknown()),
  facts: z.array(z.unknown()),
})

type ExportOptions = {
  requireUser: preHandlerHookHandler
  requireCandidate: preHandlerHookHandler
  supabaseAdmin: SupabaseClient | undefined
  cvStoreFor: (request: FastifyRequest) => CvStore | undefined
  candidateStoreFor: (request: FastifyRequest) => CandidateStore | undefined
  factStoreFor: (request: FastifyRequest) => FactStore | undefined
}

/**
 * "Download my data" (policy PRIV-05): everything stored about the candidate
 * as one JSON document. CV files themselves are downloaded from the CV page.
 */
export const exportRoutes: FastifyPluginAsyncZod<ExportOptions> = async (app, options) => {
  app.get(
    "/me/export",
    {
      preHandler: [options.requireUser, options.requireCandidate],
      schema: {
        summary: "Everything stored about the signed-in candidate, as JSON",
        tags: ["account"],
        security: [{ bearer: [] }],
        response: { 200: ExportResponse, 403: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const cvs = options.cvStoreFor(request)
      const candidates = options.candidateStoreFor(request)
      const facts = options.factStoreFor(request)
      if (!cvs || !candidates || !facts || !options.supabaseAdmin) {
        return reply.code(503).send({ error: "database_not_configured" })
      }
      const user = request.user!
      const [profile, candidate, consents, files, factRows] = await Promise.all([
        options.supabaseAdmin
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .maybeSingle(),
        candidates.get(),
        candidates.listConsents(),
        cvs.listCvs(),
        facts.list(),
      ])
      if (profile.error) throw profile.error

      const cvExport = await Promise.all(
        files.map(async (file) => {
          const summaries = await cvs.listVersions(file.id)
          const versions = await Promise.all(
            summaries.map((v) => cvs.getVersion(file.id, v.version))
          )
          return {
            fileName: file.file_name,
            mediaType: file.media_type,
            sizeBytes: file.size_bytes,
            status: file.status,
            uploadedAt: file.created_at,
            versions: versions.filter(Boolean).map((v) => ({
              version: v!.version,
              source: v!.source,
              label: v!.label,
              createdAt: v!.created_at,
              data: v!.data,
            })),
          }
        })
      )

      void reply.header(
        "Content-Disposition",
        `attachment; filename="hyperlynx-data-${new Date().toISOString().slice(0, 10)}.json"`
      )
      return {
        format: "hyperlynx-export-v1" as const,
        exportedAt: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email,
          role: (profile.data?.role as string | undefined) ?? null,
          fullName: (profile.data?.full_name as string | null | undefined) ?? null,
        },
        candidate: candidate ? toCandidate(candidate) : null,
        consents: consents.map((c) => ({
          kind: c.kind,
          granted: c.granted,
          wordingVersion: c.text_version,
          at: c.created_at,
        })),
        cvs: cvExport,
        facts: factRows.map(toFact),
      }
    }
  )
}
