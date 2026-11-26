"use server"

import { revalidatePath } from "next/cache"

import { apiFetchAsUser } from "@/lib/api/server"

export type CompanyActionResult = { ok: true } | { ok: false; error: string }

async function call(path: string, method: string, body?: unknown): Promise<CompanyActionResult> {
  const res = await apiFetchAsUser(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  revalidatePath("/admin/companies")
  if (res.ok) return { ok: true }
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  return { ok: false, error: data?.error ?? `http_${res.status}` }
}

/** Add a company board to an ATS source. */
export async function addCompany(input: { ats: string; slug: string; name: string }) {
  return call("/admin/companies", "POST", input)
}

/** Switch a company board on or off. */
export async function setCompanyEnabled(id: string, enabled: boolean) {
  return call(`/admin/companies/${encodeURIComponent(id)}`, "PATCH", { enabled })
}

/** Remove a company board (its jobs expire once no run lists them). */
export async function removeCompany(id: string) {
  return call(`/admin/companies/${encodeURIComponent(id)}`, "DELETE")
}
