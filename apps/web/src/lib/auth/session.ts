import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

import { isAppRole, type AppRole } from "./roles"

export type SessionUser = {
  id: string
  email: string
  role: AppRole
  fullName: string | null
}

/**
 * The signed-in user for this request, or null. The login token is verified
 * (getClaims checks its signature), and the role comes from the user's own
 * profile row, which row-level security limits to that user.
 * Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", claims.sub)
    .maybeSingle()
  if (!profile || !isAppRole(profile.role)) return null

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    role: profile.role,
    fullName: typeof profile.full_name === "string" ? profile.full_name : null,
  }
})
