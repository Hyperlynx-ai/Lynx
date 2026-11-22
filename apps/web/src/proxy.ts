import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

// Next.js 16 "proxy" (formerly middleware). PROTECTED AREA (authentication).
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Every page except static files, images and the /api rewrite to apps/api.
    "/((?!_next/static|_next/image|api/|brand/|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
