import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Landing point for Google sign-in and email links (password reset). Exchanges
 * the one-time code for a session, then hands over to /auth/continue, which
 * decides where the user goes.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const expect = searchParams.get("expect") ?? ""
  const next = searchParams.get("next") ?? ""

  const failed = new URL("/login", origin)
  failed.searchParams.set("error", "callback")

  if (!code) return NextResponse.redirect(failed)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(failed)

  const target = new URL("/auth/continue", origin)
  if (expect) target.searchParams.set("expect", expect)
  if (next) target.searchParams.set("next", next)
  return NextResponse.redirect(target)
}
