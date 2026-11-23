import swagger from "@fastify/swagger"
import type { SupabaseClient } from "@supabase/supabase-js"
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyServerOptions,
} from "fastify"
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"

import { readEnv, type Env } from "./env.js"
import { createSupabaseAdmin } from "./lib/supabase-admin.js"
import { createSupabaseForUser } from "./lib/supabase-user.js"
import { createAiClient, type AiClient } from "./modules/ai/client.js"
import { adminRoutes } from "./modules/admin/routes.js"
import { makeRequireUser } from "./modules/auth/plugin.js"
import { makeRequireRole } from "./modules/auth/require-role.js"
import { createTokenVerifier, type VerifyToken } from "./modules/auth/verify-token.js"
import { candidateRoutes } from "./modules/candidates/routes.js"
import { createSupabaseCandidateStore, type CandidateStore } from "./modules/candidates/store.js"
import { cvEditRoutes } from "./modules/cvs/edit-routes.js"
import { cvRoutes } from "./modules/cvs/routes.js"
import { factRoutes } from "./modules/facts/routes.js"
import { createSupabaseFactStore, type FactStore } from "./modules/facts/store.js"
import { exportRoutes } from "./modules/me/export.js"
import { createSupabaseCvStore, type CvStore } from "./modules/cvs/store.js"
import { healthRoutes } from "./modules/health/routes.js"
import { meRoutes } from "./modules/me/routes.js"

/** Fastify options for this API (used by server.ts and buildApp). */
export function serverOptions(env: Env): FastifyServerOptions {
  return {
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: env.LOG_LEVEL,
            // Never log IP addresses or headers: they are personal data (PRIV-02).
            serializers: {
              req: (req) => ({ method: req.method, url: req.url }),
            },
          },
  }
}

/** External services, replaceable in tests. */
export type AppDeps = {
  verifyToken?: VerifyToken
  supabaseAdmin?: SupabaseClient
  aiClient?: AiClient
  /** CV data access acting as the request's user. */
  cvStoreFor?: (request: FastifyRequest) => CvStore | undefined
  /** Candidate profile and consents, acting as the request's user. */
  candidateStoreFor?: (request: FastifyRequest) => CandidateStore | undefined
  /** What Lynx knows about the candidate, acting as the request's user. */
  factStoreFor?: (request: FastifyRequest) => FactStore | undefined
}

function defaultDeps(env: Env): AppDeps {
  /** Supabase client acting as the signed-in user (row-level security applies). */
  const userDb = (request: FastifyRequest) =>
    env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY && request.accessToken
      ? createSupabaseForUser(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, request.accessToken)
      : undefined
  const supabaseAdmin =
    env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
      ? createSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)
      : undefined
  return {
    verifyToken: env.SUPABASE_URL ? createTokenVerifier(env.SUPABASE_URL) : undefined,
    supabaseAdmin,
    aiClient: createAiClient({
      baseUrl: env.AI_SERVICE_URL,
      token: env.AI_SERVICE_TOKEN,
      supabaseAdmin,
    }),
    cvStoreFor: (request) => {
      const db = userDb(request)
      return db ? createSupabaseCvStore(db, request.user!.id) : undefined
    },
    candidateStoreFor: (request) => {
      const db = userDb(request)
      return db ? createSupabaseCandidateStore(db, request.user!.id) : undefined
    },
    factStoreFor: (request) => {
      const db = userDb(request)
      return db ? createSupabaseFactStore(db, request.user!.id) : undefined
    },
  }
}

/**
 * Registers plugins and every module on a Fastify instance. Each feature lives
 * in src/modules/<name>/ and is registered here.
 */
export async function configureApp(instance: FastifyInstance, env: Env, deps?: AppDeps) {
  const app = instance.withTypeProvider<ZodTypeProvider>()
  const none = () => undefined
  const {
    verifyToken,
    supabaseAdmin,
    aiClient,
    cvStoreFor = none,
    candidateStoreFor = none,
    factStoreFor = none,
  } = deps ?? defaultDeps(env)

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(swagger, {
    openapi: {
      info: { title: "Hyperlynx API", version: "0.1.0" },
      components: {
        securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      },
    },
    transform: jsonSchemaTransform,
  })

  app.decorate("env", env)
  const requireUser = makeRequireUser(verifyToken)
  const requireAdmin = makeRequireRole(supabaseAdmin)("admin")
  const requireCandidate = makeRequireRole(supabaseAdmin)("candidate")

  await app.register(healthRoutes)
  await app.register(meRoutes, { requireUser, supabaseAdmin })
  await app.register(adminRoutes, { requireUser, requireAdmin, supabaseAdmin, aiClient })
  await app.register(cvRoutes, {
    requireUser,
    requireCandidate,
    cvStoreFor,
    factStoreFor,
    candidateStoreFor,
    aiClient,
  })
  await app.register(candidateRoutes, {
    requireUser,
    requireCandidate,
    candidateStoreFor,
    cvStoreFor,
  })
  await app.register(factRoutes, { requireUser, requireCandidate, factStoreFor, aiClient })
  await app.register(cvEditRoutes, {
    requireUser,
    requireCandidate,
    cvStoreFor,
    candidateStoreFor,
    factStoreFor,
    aiClient,
  })
  await app.register(exportRoutes, {
    requireUser,
    requireCandidate,
    supabaseAdmin,
    cvStoreFor,
    candidateStoreFor,
    factStoreFor,
  })

  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger())

  return app
}

/** Builds the app without starting it: for tests and the OpenAPI export. */
export async function buildApp(env: Env = readEnv(), deps?: AppDeps) {
  return configureApp(Fastify(serverOptions(env)), env, deps)
}

declare module "fastify" {
  interface FastifyInstance {
    env: Env
  }
}
