import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"

const AiStatus = z.enum(["ok", "unreachable", "not-configured"])

export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.literal("api"),
  version: z.string(),
  environment: z.string(),
  ai: AiStatus,
})

/**
 * Checks that services/ai answers. Never throws. The timeout allows for a
 * serverless cold start of the Python service (a few seconds on Vercel).
 */
export async function checkAiService(baseUrl: string | undefined, timeoutMs = 10_000) {
  if (!baseUrl) return "not-configured" as const
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res.ok ? ("ok" as const) : ("unreachable" as const)
  } catch {
    return "unreachable" as const
  }
}

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        summary: "Liveness check that also reports whether services/ai is reachable",
        tags: ["system"],
        response: { 200: HealthResponse },
      },
    },
    async () => ({
      status: "ok" as const,
      service: "api" as const,
      version: app.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      environment: app.env.VERCEL_ENV ?? app.env.NODE_ENV,
      ai: await checkAiService(app.env.AI_SERVICE_URL),
    })
  )
}
