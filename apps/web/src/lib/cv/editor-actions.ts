"use server"

import { revalidatePath } from "next/cache"

import type { paths } from "@lynx/types/api"
import type { CvData } from "@lynx/shared/cv"
import type { CvSection } from "@lynx/shared/cv-edit"

import { apiFetchAsUser } from "@/lib/api/server"

export type Proposal =
  paths["/cvs/{id}/ai-edit"]["post"]["responses"]["200"]["content"]["application/json"]
type TailorResponse =
  paths["/cvs/{id}/tailor"]["post"]["responses"]["200"]["content"]["application/json"]

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

async function post<T>(path: string, body: unknown, method = "POST"): Promise<Result<T>> {
  const res = await apiFetchAsUser(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (res.ok && data) return { ok: true, data }
  return { ok: false, error: data?.error ?? `http_${res.status}` }
}

const cvPath = (cvId: string, rest: string) => `/cvs/${encodeURIComponent(cvId)}/${rest}`

/** Ask Lynx to edit one section; returns a proposal to accept or reject. */
export async function aiEditSection(input: {
  cvId: string
  version: number
  section: CvSection
  instruction: string
  targetRole?: string
}): Promise<Result<Proposal>> {
  const { cvId, ...body } = input
  return post<Proposal>(cvPath(cvId, "ai-edit"), body)
}

/** Tailor the CV to a role: proposals for the summary, experience and skills. */
export async function tailorCv(input: {
  cvId: string
  version: number
  role: string
}): Promise<Result<TailorResponse>> {
  const { cvId, ...body } = input
  return post<TailorResponse>(cvPath(cvId, "tailor"), body)
}

/** Save the edited CV as a new version. */
export async function saveCvVersion(input: {
  cvId: string
  data: CvData
  source: "candidate_edit" | "ai_edit" | "tailored"
  label: string | null
}): Promise<Result<{ version: number }>> {
  const { cvId, ...body } = input
  const result = await post<{ version: number }>(cvPath(cvId, "versions"), body)
  revalidatePath("/app/cv", "layout")
  return result
}

/** Use a version for matching (Lynx's CV facts follow it). */
export async function setMatchingCv(cvId: string, version: number): Promise<Result<unknown>> {
  const result = await post<unknown>("/me/candidate/matching-cv", { cvId, version }, "PUT")
  revalidatePath("/app", "layout")
  return result
}
