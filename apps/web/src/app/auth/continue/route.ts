import { NextResponse, type NextRequest } from "next/server"

import { apiFetchAsUser } from "@/lib/api/server"
import { safeNext } from "@/lib/auth/redirect"
import { isAppRole, ROLE_HOME, ROLE_LOGIN, type AppRole } from "@/lib/auth/roles"
import { getSessionUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

/**
 * Where every login ends up. Sends the user to their area (or to ?next=),
 * and if they used the other role's login page, signs them out and explains
 * (one role per account).
 *
 *   ?expect=candidate|recruiter   which login page they came from
 *   ?next=/path                   where to go afterwards (same site only)
 *   ?claim=1                      Google from a recruiter page: a brand-new
 *                                 account may become a recruiter account
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const expect = searchParams.get("expect")
  const user = await getSessionUser()
  const go = (path: string, params: Record<string, string> = {}) => {
    const url = new URL(path, origin)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    return NextResponse.redirect(url)
  }

  if (!user) return go("/login", { error: "session" })

  let role: AppRole = user.role
  if (expect === "recruiter" && role === "candidate" && searchParams.get("claim") === "1") {
    const claim = await apiFetchAsUser("/me/recruiter-claim", { method: "POST" })
    if (claim.ok) {
      role = "recruiter"
    } else {
      const body = (await claim.json().catch(() => ({}))) as {
        error?: string
        newAccount?: boolean
      }
      if (body.error === "work_email_required" && body.newAccount) {
        // The Google account was created just now from a recruiter page: undo it.
        await apiFetchAsUser("/me", { method: "DELETE" })
        await (await createClient()).auth.signOut()
        return go("/recruiters/signup", { error: "work-email" })
      }
      // Otherwise it's an existing candidate account: fall through to "wrong area".
    }
  }

  const cameFromOtherArea =
    isAppRole(expect) && expect !== "admin" && role !== "admin" && expect !== role
  if (cameFromOtherArea) {
    await (await createClient()).auth.signOut()
    return go(ROLE_LOGIN[role], { error: "wrong-area", account: role })
  }

  const home = ROLE_HOME[role]
  const next = safeNext(searchParams.get("next"), home)
  // Only follow ?next= inside the user's own area (or public pages).
  const target = next.startsWith(home) || !/^\/(app|recruiter|admin)(\/|$)/.test(next) ? next : home
  return go(target)
}
