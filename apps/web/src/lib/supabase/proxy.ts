import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { areaRoleFor, ROLE_LOGIN } from "@/lib/auth/roles"

import { isSupabaseConfigured, supabaseEnv } from "./env"

/**
 * Runs before every page request (see src/proxy.ts):
 * 1. refreshes the Supabase session cookies when the access token expired;
 * 2. sends signed-out visitors of a signed-in area to the right login page.
 * Role checks happen in each area's layout (it needs the profile).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!isSupabaseConfigured()) return response

  const { url, publishableKey } = supabaseEnv()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      },
    },
  })

  // Do not run code between createServerClient and getClaims (Supabase guidance).
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)

  const areaRole = areaRoleFor(request.nextUrl.pathname)
  if (areaRole && !signedIn) {
    const login = request.nextUrl.clone()
    login.pathname = ROLE_LOGIN[areaRole]
    login.search = ""
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }
  return response
}
