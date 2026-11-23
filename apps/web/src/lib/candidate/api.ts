import type { paths } from "@lynx/types/api"

import { apiFetchAsUser } from "@/lib/api/server"
import { createClient } from "@/lib/supabase/server"

export type CandidateResponse =
  paths["/me/candidate"]["get"]["responses"]["200"]["content"]["application/json"]
export type Candidate = NonNullable<CandidateResponse["candidate"]>

/** The candidate's profile and prefill suggestions, or null if the API failed. */
export async function getCandidate(): Promise<CandidateResponse | null> {
  const res = await apiFetchAsUser("/me/candidate")
  if (!res.ok) return null
  return (await res.json()) as CandidateResponse
}

/**
 * Whether the signed-in candidate finished onboarding. Reads their own row
 * directly (row-level security), so pages can check it cheaply.
 */
export async function isOnboarded(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("candidates")
    .select("onboarded_at")
    .eq("user_id", userId)
    .maybeSingle()
  return Boolean(data?.onboarded_at)
}

export type Fact =
  paths["/me/facts"]["get"]["responses"]["200"]["content"]["application/json"]["facts"][number]

/** Everything Lynx knows about the candidate, or null if the API failed. */
export async function getFacts(): Promise<Fact[] | null> {
  const res = await apiFetchAsUser("/me/facts")
  if (!res.ok) return null
  return ((await res.json()) as { facts: Fact[] }).facts
}
