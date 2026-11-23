"use server"

import { revalidatePath } from "next/cache"

import type { CandidateConsentsInput, CandidateProfileInput } from "@lynx/shared/candidate"

import { apiFetchAsUser } from "@/lib/api/server"

export type SaveResult = { ok: true } | { ok: false; error: string }

async function put(path: string, body: unknown): Promise<SaveResult> {
  const res = await apiFetchAsUser(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  revalidatePath("/app", "layout")
  if (res.ok) return { ok: true }
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  return { ok: false, error: data?.error ?? `http_${res.status}` }
}

/** Save the profile answers (onboarding step 2, profile page). */
export async function saveProfile(input: CandidateProfileInput): Promise<SaveResult> {
  return put("/me/candidate/profile", input)
}

/** Save consent choices; `completeOnboarding` on the last onboarding step. */
export async function saveConsents(
  input: CandidateConsentsInput & { completeOnboarding?: boolean }
): Promise<SaveResult> {
  return put("/me/candidate/consents", input)
}
