import "./load-env.js"

import type { IncomingMessage, ServerResponse } from "node:http"

import Fastify from "fastify"

import { configureApp, serverOptions } from "./create-app.js"
import { readEnv } from "./env.js"

// Entry point. Vercel detects this file (src/server.ts); it requires the entry
// to import fastify, so the instance is created here.
const env = readEnv()
const app = await configureApp(Fastify(serverOptions(env)), env)

/** On Vercel each request is handed to Fastify through this function. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await app.ready()
  app.server.emit("request", req, res)
}

// Locally (`pnpm dev`, run with tsx), start a normal server instead.
if (!process.env.VERCEL) {
  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}
