import { afterEach, describe, expect, it, vi } from "vitest"

import { buildApp } from "../../app.js"
import { readEnv } from "../../env.js"
import { checkAiService } from "./routes.js"

describe("GET /health", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reports ok and the AI service status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 }))
    )
    const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }))

    const res = await app.inject({ method: "GET", url: "/health" })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: "ok", service: "api", ai: "ok" })
    await app.close()
  })

  it("still answers when the AI service is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused")
      })
    )
    const app = await buildApp(readEnv({ NODE_ENV: "test", AI_SERVICE_URL: "http://ai.test" }))

    const res = await app.inject({ method: "GET", url: "/health" })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ai: "unreachable" })
    await app.close()
  })
})

describe("checkAiService", () => {
  it("returns not-configured without a URL", async () => {
    expect(await checkAiService(undefined)).toBe("not-configured")
  })
})
