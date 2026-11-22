import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { supabaseEnv } from "./env"

/**
 * Supabase client for server components, route handlers and server actions.
 * Create one per request. Cookie writes fail silently in server components
 * (they can't set cookies); proxy.ts refreshes the session instead.
 */
export async function createClient() {
  // Read cookies first: it marks the page as per-request (dynamic), so
  // `next build` never tries to pre-render signed-in pages, even when the
  // Supabase settings aren't available at build time (e.g. in CI).
  const cookieStore = await cookies()
  const { url, publishableKey } = supabaseEnv()
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a server component: ignore (see comment above).
        }
      },
    },
  })
}
