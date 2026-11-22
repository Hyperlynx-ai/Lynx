import swagger from "@fastify/swagger"
import Fastify from "fastify"
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"

import { readEnv, type Env } from "./env.js"
import { healthRoutes } from "./modules/health/routes.js"

/**
 * Builds the Fastify app without starting it, so tests and the OpenAPI export
 * can use it too. Each feature lives in src/modules/<name>/ and registers its
 * routes here.
 */
export async function buildApp(env: Env = readEnv()) {
  const app = Fastify({
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
  }).withTypeProvider<ZodTypeProvider>()

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

declare module "fastify" {
  interface FastifyInstance {
    env: Env
  }
}
