import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { dailyCapFor } from "./caps.js"

/** What services/ai reports with every task result (never personal data). */
export const AiUsage = z.object({
  task: z.string(),
  model: z.string(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  latency_ms: z.number(),
  cost_usd: z.number().nullable(),
})
export type AiUsage = z.infer<typeof AiUsage>

export class AiError extends Error {
  constructor(
    readonly code: "capped" | "not_configured" | "failed",
    message: string
  ) {
    super(message)
  }
}

export type AiClientOptions = {
  baseUrl: string
  token: string | undefined
  /** Admin client used to log calls and count today's usage. */
  supabaseAdmin: SupabaseClient | undefined
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

/**
 * Calls services/ai for a signed-in user: checks their daily cap for the task,
 * sends the request with the service token, logs the call in ai_calls (AI-07),
 * and returns the parsed result.
 */
export function createAiClient(options: AiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 90_000
  const base = options.baseUrl.replace(/\/+$/, "")

  async function log(row: {
    user_id: string | null
    task: string
    status: "ok" | "error" | "capped"
    usage?: AiUsage
    error_code?: string
  }) {
    if (!options.supabaseAdmin) return
    await options.supabaseAdmin.from("ai_calls").insert({
      user_id: row.user_id,
      task: row.task,
      status: row.status,
      model: row.usage?.model ?? null,
      input_tokens: row.usage?.input_tokens ?? null,
      output_tokens: row.usage?.output_tokens ?? null,
      latency_ms: row.usage?.latency_ms ?? null,
      cost_usd: row.usage?.cost_usd ?? null,
      error_code: row.error_code ?? null,
    })
  }

  /** How many calls of `task` this user made in the last 24 hours. */
  async function usedToday(userId: string, task: string): Promise<number> {
    if (!options.supabaseAdmin) return 0
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await options.supabaseAdmin
      .from("ai_calls")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("task", task)
      .in("status", ["ok", "error"])
      .gte("created_at", since)
    if (error) throw error
    return count ?? 0
  }

  return {
    usedToday,

    async call<T extends z.ZodTypeAny>(
      task: string,
      path: string,
      body: unknown,
      userId: string,
      schema: T
    ): Promise<z.infer<T>> {
      if (!options.token) throw new AiError("not_configured", "AI_SERVICE_TOKEN is not set")
      if ((await usedToday(userId, task)) >= dailyCapFor(task)) {
        await log({ user_id: userId, task, status: "capped" })
        throw new AiError("capped", `Daily limit reached for ${task}`)
      }

      let res: Response
      try {
        res = await fetchImpl(`${base}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch {
        await log({ user_id: userId, task, status: "error", error_code: "unreachable" })
        throw new AiError("failed", "The AI service didn't answer")
      }
      if (!res.ok) {
        await log({ user_id: userId, task, status: "error", error_code: `http_${res.status}` })
        throw new AiError("failed", `The AI service answered ${res.status}`)
      }

      const json = (await res.json()) as { usage?: unknown }
      const usage = AiUsage.safeParse(json.usage)
      await log({
        user_id: userId,
        task,
        status: "ok",
        usage: usage.success ? usage.data : undefined,
      })
      return schema.parse(json)
    },
  }
}

export type AiClient = ReturnType<typeof createAiClient>
