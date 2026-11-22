import swagger from "@fastify/swagger"
import type { SupabaseClient } from "@supabase/supabase-js"
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify"
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"

import { readEnv, type Env } from "./env.js"
import { createSupabaseAdmin } from "./lib/supabase-admin.js"
import { makeRequireUser } from "./modules/auth/plugin.js"
import { createTokenVerifier, type VerifyToken } from "./modules/auth/verify-token.js"
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
}

function defaultDeps(env: Env): AppDeps {
  return {
    verifyToken: env.SUPABASE_URL ? createTokenVerifier(env.SUPABASE_URL) : undefined,
    supabaseAdmin:
      env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
        ? createSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)
        : undefined,
  }
}

/**
 * Registers plugins and every module on a Fastify instance. Each feature lives
 * in src/modules/<name>/ and is registered here.
 */
export async function configureApp(instance: FastifyInstance, env: Env, deps?: AppDeps) {
  const app = instance.withTypeProvider<ZodTypeProvider>()
  const { verifyToken, supabaseAdmin } = deps ?? defaultDeps(env)

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

  await app.register(healthRoutes)
  await app.register(meRoutes, { requireUser, supabaseAdmin })

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
