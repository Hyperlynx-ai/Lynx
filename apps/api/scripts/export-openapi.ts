/**
 * Writes the API's OpenAPI spec to packages/types/openapi/api.json, from which
 * typed clients are generated (`pnpm api:types` at the repo root).
 */
import { mkdirSync, writeFileSync } from "node:fs"

import { buildApp } from "../src/create-app.js"
import { readEnv } from "../src/env.js"

const app = await buildApp(readEnv({ NODE_ENV: "test" }))
await app.ready()

const outDir = new URL("../../../packages/types/openapi/", import.meta.url)
mkdirSync(outDir, { recursive: true })
writeFileSync(new URL("api.json", outDir), `${JSON.stringify(app.swagger(), null, 2)}\n`)
await app.close()

console.log("wrote packages/types/openapi/api.json")
