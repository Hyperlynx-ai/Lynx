"use server"

import { revalidatePath } from "next/cache"

import type { FactInput } from "@lynx/shared/facts"

import { apiFetchAsUser } from "@/lib/api/server"

export type FactResult = { ok: true; added?: number } | { ok: false; error: string }

async function send(path: string, method: string, body?: unknown): Promise<FactResult> {
  const res = await apiFetchAsUser(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  revalidatePath("/app/profile")
  const data = (await res.json().catch(() => null)) as {
    error?: string
    facts?: unknown[]
  } | null
  if (res.ok) return { ok: true, added: data?.facts?.length }
  return { ok: false, error: data?.error ?? `http_${res.status}` }
}

export async function addFact(fact: FactInput): Promise<FactResult> {
  return send("/me/facts", "POST", fact)
}

export async function updateFact(id: string, fact: FactInput): Promise<FactResult> {
  return send(`/me/facts/${encodeURIComponent(id)}`, "PATCH", fact)
}

export async function deleteFact(id: string): Promise<FactResult> {
  return send(`/me/facts/${encodeURIComponent(id)}`, "DELETE")
}

/** "Tell Lynx more": free text becomes facts. */
export async function tellLynx(text: string): Promise<FactResult> {
  return send("/me/facts/tell", "POST", { text })
}
