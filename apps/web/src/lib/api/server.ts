import { withRelatedProject } from "@vercel/related-projects"

import { createClient } from "@/lib/supabase/server"

/**
 * Base URL of apps/api for server-side calls (route handlers, server
 * components). Same rules as the /api rewrite in next.config.ts.
 */
export function apiBaseUrl(): string {
  return withRelatedProject({
    projectName: "lynx-api",
    defaultHost: process.env.API_URL ?? "http://127.0.0.1:4000",
  }).replace(/\/+$/, "")
}

/** Calls apps/api as the signed-in user (forwards their access token). */
export async function apiFetchAsUser(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(`${apiBaseUrl()}${path}`, { ...init, headers, cache: "no-store" })
}
