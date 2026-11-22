import { NextResponse, type NextRequest } from "next/server"

import { safeNext } from "@/lib/auth/redirect"
import { isAppRole, ROLE_HOME, ROLE_LOGIN } from "@/lib/auth/roles"
import { getSessionUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

/**
 * Where every login ends up. Sends the user to their area (or to ?next=),
 * and if they used the other role's login page, signs them out and explains
 * (one role per account).
 *
 *   ?expect=candidate|recruiter   which login page they came from
 *   ?next=/path                   where to go afterwards (same site only)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const expect = searchParams.get("expect")
  const user = await getSessionUser()

  if (!user) {
    const login = new URL("/login", origin)
    login.searchParams.set("error", "session")
    return NextResponse.redirect(login)
  }

  const cameFromOtherArea =
    isAppRole(expect) && expect !== "admin" && user.role !== "admin" && expect !== user.role
  if (cameFromOtherArea) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    const login = new URL(ROLE_LOGIN[user.role], origin)
    login.searchParams.set("error", "wrong-area")
    login.searchParams.set("account", user.role)
    return NextResponse.redirect(login)
  }

  const home = ROLE_HOME[user.role]
  const next = safeNext(searchParams.get("next"), home)
  // Only follow ?next= inside the user's own area (or public pages).
  const target = next.startsWith(home) || !/^\/(app|recruiter|admin)(\/|$)/.test(next) ? next : home
  return NextResponse.redirect(new URL(target, origin))
}
