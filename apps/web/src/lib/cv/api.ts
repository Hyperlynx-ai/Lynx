import type { paths } from "@lynx/types/api"

import { apiFetchAsUser } from "@/lib/api/server"

export type CvList = paths["/cvs"]["get"]["responses"]["200"]["content"]["application/json"]
export type CvFile = CvList["cvs"][number]
export type CvDetail = paths["/cvs/{id}"]["get"]["responses"]["200"]["content"]["application/json"]

/** The candidate's CV files (newest first), or null if the API failed. */
export async function listCvs(): Promise<CvFile[] | null> {
  const res = await apiFetchAsUser("/cvs")
  if (!res.ok) return null
  return ((await res.json()) as CvList).cvs
}

/** One CV with its versions and the latest content, or null. */
export async function getCv(id: string): Promise<CvDetail | null> {
  const res = await apiFetchAsUser(`/cvs/${encodeURIComponent(id)}`)
  if (!res.ok) return null
  return (await res.json()) as CvDetail
}
