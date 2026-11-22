import swagger from "@fastify/swagger"
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify"
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"

import { readEnv, type Env } from "./env.js"
import { healthRoutes } from "./modules/health/routes.js"

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

/**
 * Registers plugins and every module on a Fastify instance. Each feature lives
 * in src/modules/<name>/ and is registered here.
 */
export async function configureApp(instance: FastifyInstance, env: Env) {
  const app = instance.withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(swagger, {
    openapi: {
      info: { title: "Hyperlynx API", version: "0.1.0" },
    },
    transform: jsonSchemaTransform,
  })

  app.decorate("env", env)
  await app.register(healthRoutes)

  app.get("/openapi.json", { schema: { hide: true } }, async () => app.swagger())

  return app
}

/** Builds the app without starting it: for tests and the OpenAPI export. */
export async function buildApp(env: Env = readEnv()) {
  return configureApp(Fastify(serverOptions(env)), env)
}

declare module "fastify" {
  interface FastifyInstance {
    env: Env
  }
}
