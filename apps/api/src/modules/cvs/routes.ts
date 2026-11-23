import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify"
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

import { CV_MEDIA_TYPES, CvData, isCvMediaType, MAX_CV_BYTES } from "../../shared/cv.js"

import { AiError, AiUsage, type AiClient } from "../ai/client.js"
import type { CvRow, CvStore, CvVersionRow, CvVersionSummary } from "./store.js"

/** How long the AI service's download link to the file stays valid. */
const SIGNED_URL_SECONDS = 300

const ErrorResponse = z.object({ error: z.string(), cvId: z.string().optional() })

const CvStatus = z.enum(["uploaded", "parsing", "parsed", "failed", "not_a_cv"])
const CvSource = z.enum(["parsed", "ai_edit", "candidate_edit", "tailored"])

export const CvFile = z.object({
  id: z.string(),
  fileName: z.string(),
  mediaType: z.string(),
  sizeBytes: z.number().nullable(),
  status: CvStatus,
  createdAt: z.string(),
})

export const CvVersionInfo = z.object({
  id: z.string(),
  version: z.number(),
  source: CvSource,
  label: z.string().nullable(),
  createdAt: z.string(),
})

export const CvVersion = CvVersionInfo.extend({ data: CvData })

/** What services/ai returns for cv_parse. */
const CvParseResult = z.object({ is_cv: z.boolean(), cv: CvData, usage: AiUsage })

const toFile = (row: CvRow): z.infer<typeof CvFile> => ({
  id: row.id,
  fileName: row.file_name,
  mediaType: row.media_type,
  sizeBytes: row.size_bytes,
  status: row.status,
  createdAt: row.created_at,
})

const toVersionInfo = (row: CvVersionSummary): z.infer<typeof CvVersionInfo> => ({
  id: row.id,
  version: row.version,
  source: row.source,
  label: row.label,
  createdAt: row.created_at,
})

const toVersion = (row: CvVersionRow): z.infer<typeof CvVersion> => ({
  ...toVersionInfo(row),
  data: row.data,
})

/** Files are uploaded by the browser to cvs/<user id>/<random name>.<pdf|docx>. */
export function isOwnUploadPath(path: string, userId: string, mediaType: string): boolean {
  if (!isCvMediaType(mediaType)) return false
  const extension = CV_MEDIA_TYPES[mediaType]
  const pattern = new RegExp(`^${userId}/[A-Za-z0-9_-]{8,64}\\.${extension}$`)
  return pattern.test(path)
}

type CvRoutesOptions = {
  requireUser: preHandlerHookHandler
  requireCandidate: preHandlerHookHandler
  /** A store acting as the user, or undefined when Supabase isn't configured. */
  cvStoreFor: (request: FastifyRequest) => CvStore | undefined
  aiClient: AiClient | undefined
}

/** The signed-in candidate's CVs: upload, AI parsing and versions (chunk 2.2). */
export const cvRoutes: FastifyPluginAsyncZod<CvRoutesOptions> = async (
  app,
  { requireUser, requireCandidate, cvStoreFor, aiClient }
) => {
  const common = { preHandler: [requireUser, requireCandidate] }
  const doc = { tags: ["cvs"], security: [{ bearer: [] }] }

  function storeOr503(request: FastifyRequest, reply: FastifyReply) {
    const store = cvStoreFor(request)
    if (!store) void reply.code(503).send({ error: "database_not_configured" })
    return store
  }

  /** Sends the file to services/ai and saves the result as version 1. */
  async function parseAndSave(
    request: FastifyRequest,
    reply: FastifyReply,
    store: CvStore,
    cv: CvRow
  ) {
    if (!aiClient) return reply.code(503).send({ error: "ai_not_configured", cvId: cv.id })
    const fileUrl = await store.signedUrl(cv.storage_path, SIGNED_URL_SECONDS)
    if (!fileUrl) {
      await store.setStatus(cv.id, "failed")
      return reply.code(400).send({ error: "file_not_found", cvId: cv.id })
    }
    await store.setStatus(cv.id, "parsing")

    let result: z.infer<typeof CvParseResult>
    try {
      result = await aiClient.call(
        "cv_parse",
        "/v1/cv/parse",
        { file_url: fileUrl, media_type: cv.media_type },
        request.user!.id,
        CvParseResult
      )
    } catch (error) {
      if (!(error instanceof AiError)) throw error
      if (error.code === "capped") {
        await store.setStatus(cv.id, "uploaded")
        return reply.code(429).send({ error: "daily_limit", cvId: cv.id })
      }
      await store.setStatus(cv.id, "failed")
      if (error.code === "not_configured") {
        return reply.code(503).send({ error: "ai_not_configured", cvId: cv.id })
      }
      request.log.warn({ cvId: cv.id }, "cv parse failed")
      return reply.code(502).send({ error: "parse_failed", cvId: cv.id })
    }

    if (!result.is_cv) {
      await store.setStatus(cv.id, "not_a_cv")
      return reply.code(422).send({ error: "not_a_cv", cvId: cv.id })
    }
    const version = await store.addVersion(cv.id, {
      source: "parsed",
      label: "Original",
      data: result.cv,
    })
    await store.setStatus(cv.id, "parsed")
    return reply.code(201).send({
      cv: toFile({ ...cv, status: "parsed" }),
      version: toVersion(version),
    })
  }

  const ParsedResponse = z.object({ cv: CvFile, version: CvVersion })
  const parseResponses = {
    201: ParsedResponse,
    400: ErrorResponse,
    403: ErrorResponse,
    404: ErrorResponse,
    409: ErrorResponse,
    422: ErrorResponse,
    429: ErrorResponse,
    502: ErrorResponse,
    503: ErrorResponse,
  }

  app.post(
    "/cvs",
    {
      ...common,
      schema: {
        summary: "Register a CV file the browser uploaded, and parse it with Lynx",
        ...doc,
        body: z.object({
          path: z.string().max(255),
          fileName: z.string().trim().min(1).max(255),
          mediaType: z.string(),
          sizeBytes: z.number().int().positive().max(MAX_CV_BYTES),
        }),
        response: parseResponses,
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const { path, fileName, mediaType, sizeBytes } = request.body
      if (!isOwnUploadPath(path, request.user!.id, mediaType)) {
        return reply.code(400).send({ error: "invalid_file" })
      }
      let cv: CvRow
      try {
        cv = await store.insertCv({
          storage_path: path,
          file_name: fileName,
          media_type: mediaType,
          size_bytes: sizeBytes,
          status: "uploaded",
        })
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          return reply.code(409).send({ error: "already_registered" })
        }
        throw error
      }
      return parseAndSave(request, reply, store, cv)
    }
  )

  app.post(
    "/cvs/:id/parse",
    {
      ...common,
      schema: {
        summary: "Try parsing a CV again (after a failure or the daily limit)",
        ...doc,
        params: z.object({ id: z.uuid() }),
        response: parseResponses,
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const cv = await store.getCv(request.params.id)
      if (!cv) return reply.code(404).send({ error: "not_found" })
      if (cv.status === "parsed" || cv.status === "parsing") {
        return reply.code(409).send({ error: `already_${cv.status}`, cvId: cv.id })
      }
      return parseAndSave(request, reply, store, cv)
    }
  )

  app.get(
    "/cvs",
    {
      ...common,
      schema: {
        summary: "The signed-in candidate's CV files, newest first",
        ...doc,
        response: {
          200: z.object({ cvs: z.array(CvFile) }),
          403: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      return { cvs: (await store.listCvs()).map(toFile) }
    }
  )

  app.get(
    "/cvs/:id",
    {
      ...common,
      schema: {
        summary: "One CV: its versions, and the content of the latest (or a chosen) version",
        ...doc,
        params: z.object({ id: z.uuid() }),
        querystring: z.object({ version: z.coerce.number().int().positive().optional() }),
        response: {
          200: z.object({
            cv: CvFile,
            versions: z.array(CvVersionInfo),
            current: CvVersion.nullable(),
          }),
          403: ErrorResponse,
          404: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const cv = await store.getCv(request.params.id)
      if (!cv) return reply.code(404).send({ error: "not_found" })
      const [versions, current] = await Promise.all([
        store.listVersions(cv.id),
        store.getVersion(cv.id, request.query.version),
      ])
      if (request.query.version !== undefined && !current) {
        return reply.code(404).send({ error: "version_not_found" })
      }
      return {
        cv: toFile(cv),
        versions: versions.map(toVersionInfo),
        current: current ? toVersion(current) : null,
      }
    }
  )

  app.delete(
    "/cvs/:id",
    {
      ...common,
      schema: {
        summary: "Delete a CV file and all its versions",
        ...doc,
        params: z.object({ id: z.uuid() }),
        response: { 204: z.null(), 403: ErrorResponse, 404: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (request, reply) => {
      const store = storeOr503(request, reply)
      if (!store) return reply
      const cv = await store.getCv(request.params.id)
      if (!cv) return reply.code(404).send({ error: "not_found" })
      await store.removeFile(cv.storage_path)
      await store.deleteCv(cv.id)
      return reply.code(204).send(null)
    }
  )
}
