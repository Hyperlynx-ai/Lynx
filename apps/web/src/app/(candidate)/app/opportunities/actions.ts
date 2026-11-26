"use server"

import { revalidatePath } from "next/cache"

import { apiFetchAsUser } from "@/lib/api/server"

/** Save, hide or clear a job in the candidate's feed. */
export async function setOpportunityState(jobId: string, state: "saved" | "hidden" | null) {
  const res = await apiFetchAsUser(`/me/opportunities/${encodeURIComponent(jobId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  })
  revalidatePath("/app/opportunities")
  return { ok: res.ok }
}
