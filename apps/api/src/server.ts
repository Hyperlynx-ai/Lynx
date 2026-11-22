import "./load-env.js"

import { buildApp } from "./app.js"

// Entry point. Vercel detects this file (src/server.ts) and runs the app as a
// single function; locally `pnpm dev` runs it with tsx.
const app = await buildApp()

try {
  await app.listen({ port: app.env.API_PORT, host: "0.0.0.0" })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
