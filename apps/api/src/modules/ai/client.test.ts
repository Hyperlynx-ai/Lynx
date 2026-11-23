import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { dailyCapFor } from "./caps.js"
import { AiError, createAiClient } from "./client.js"

const USAGE = {
  task: "ping",
  model: "gemini-test",
  input_tokens: 10,
  output_tokens: 5,
  latency_ms: 42,
  cost_usd: null,
}

/** Fake admin client: records inserted ai_calls rows and returns a usage count. */
function fakeSupabase(usedToday: number) {
  const inserted: Record<string, unknown>[] = []
  const query = {
    eq: () => query,
    in: () => query,
    gte: async () => ({ count: usedToday, error: null }),
  }
  const client = {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserted.push(row)
        return { error: null }
      },
      select: () => query,
    }),
  }
  return { client: client as unknown as SupabaseClient, inserted }
}

const schema = z.object({ output: z.string() })

describe("AI client", () => {
  it("calls the AI service with the service token and logs usage", async () => {
    const supabase = fakeSupabase(0)
    const fetchImpl = vi.fn(async () =>
      Response.json({ output: "hello", usage: USAGE })
    ) as unknown as typeof fetch
    const ai = createAiClient({
      baseUrl: "http://ai.test/",
      token: "service-token",
      supabaseAdmin: supabase.client,
      fetchImpl,
    })

    const result = await ai.call("ping", "/v1/ping", {}, "user-1", schema)

    expect(result.output).toBe("hello")
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(url).toBe("http://ai.test/v1/ping")
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer service-token" })
    expect(supabase.inserted).toEqual([
      expect.objectContaining({
        user_id: "user-1",
        task: "ping",
        status: "ok",
        model: "gemini-test",
        input_tokens: 10,
      }),
    ])
  })

  it("refuses and logs once the daily cap is reached, without calling the AI", async () => {
    const supabase = fakeSupabase(dailyCapFor("ping"))
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const ai = createAiClient({
      baseUrl: "http://ai.test",
      token: "t",
      supabaseAdmin: supabase.client,
      fetchImpl,
    })

    await expect(ai.call("ping", "/v1/ping", {}, "user-1", schema)).rejects.toMatchObject({
      code: "capped",
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(supabase.inserted).toEqual([expect.objectContaining({ status: "capped" })])
  })

  it("logs failures with an error code only", async () => {
    const supabase = fakeSupabase(0)
    const fetchImpl = vi.fn(
      async () => new Response("nope", { status: 502 })
    ) as unknown as typeof fetch
    const ai = createAiClient({
      baseUrl: "http://ai.test",
      token: "t",
      supabaseAdmin: supabase.client,
      fetchImpl,
    })

    await expect(ai.call("ping", "/v1/ping", {}, "user-1", schema)).rejects.toBeInstanceOf(AiError)
    expect(supabase.inserted).toEqual([
      expect.objectContaining({ status: "error", error_code: "http_502" }),
    ])
  })

  it("needs the service token", async () => {
    const ai = createAiClient({
      baseUrl: "http://ai.test",
      token: undefined,
      supabaseAdmin: undefined,
    })
    await expect(ai.call("ping", "/v1/ping", {}, "u", schema)).rejects.toMatchObject({
      code: "not_configured",
    })
  })
})
