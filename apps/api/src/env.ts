import { withRelatedProject } from "@vercel/related-projects"
import { z } from "zod"

/** Every environment variable the API reads, validated once at startup. */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Local port. Not called PORT: tools and hosts often set PORT for the web app. */
  API_PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** Base URL of services/ai. */
  AI_SERVICE_URL: z.url(),
  /** Shared secret sent to services/ai (policy SEC-05). */
  AI_SERVICE_TOKEN: z.string().min(1).optional(),
  /** Supabase project URL (login token verification, admin operations). */
  SUPABASE_URL: z.url().optional(),
  /** Supabase secret key: server-only, bypasses row-level security (SEC-04). */
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  /** Set automatically by Vercel. */
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
})

export type Env = z.infer<typeof EnvSchema>

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse({
    ...source,
    // On Vercel, `relatedProjects` in vercel.json links this API to the lynx-ai
    // project (production -> production, PR preview -> same-branch preview).
    // An explicit AI_SERVICE_URL always wins; locally the default is used.
    AI_SERVICE_URL:
      source.AI_SERVICE_URL ??
      withRelatedProject({ projectName: "lynx-ai", defaultHost: "http://127.0.0.1:8000" }),
  })
}
