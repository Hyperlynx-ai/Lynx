"use server"

import { revalidatePath } from "next/cache"

import { apiFetchAsUser } from "@/lib/api/server"

export type CvActionResult = { ok: true } | { ok: false; error: string }

async function result(res: Response): Promise<CvActionResult> {
  revalidatePath("/app/cv")
  revalidatePath("/app")
  if (res.ok) return { ok: true }
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  return { ok: false, error: body?.error ?? `http_${res.status}` }
}

/** After the browser uploads the file to Storage: register it and let Lynx read it. */
export async function registerCv(input: {
  path: string
  fileName: string
  mediaType: string
  sizeBytes: number
}): Promise<CvActionResult> {
  const res = await apiFetchAsUser("/cvs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return result(res)
}

/** Try reading a CV again (after a failure or the daily limit). */
export async function retryCv(id: string): Promise<CvActionResult> {
  const res = await apiFetchAsUser(`/cvs/${encodeURIComponent(id)}/parse`, { method: "POST" })
  return result(res)
}

/** Delete a CV file and everything Lynx read from it. */
export async function deleteCv(id: string): Promise<CvActionResult> {
  const res = await apiFetchAsUser(`/cvs/${encodeURIComponent(id)}`, { method: "DELETE" })
  return result(res)
}
