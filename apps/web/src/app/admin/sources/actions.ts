"use server"

import { revalidatePath } from "next/cache"

import { apiFetchAsUser } from "@/lib/api/server"

export type SourceActionResult = { ok: true } | { ok: false; error: string }

async function call(path: string, method: string, body?: unknown): Promise<SourceActionResult> {
  const res = await apiFetchAsUser(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  revalidatePath("/admin/sources")
  if (res.ok) return { ok: true }
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  return { ok: false, error: data?.error ?? `http_${res.status}` }
}

/** Switch a job source on or off. */
export async function setSourceEnabled(id: string, enabled: boolean) {
  return call(`/admin/sources/${encodeURIComponent(id)}`, "PATCH", { enabled })
}

/** Ask for a run (the hourly ingestion workflow picks it up). */
export async function requestSourceRun(id: string) {
  return call(`/admin/sources/${encodeURIComponent(id)}/run`, "POST")
}
