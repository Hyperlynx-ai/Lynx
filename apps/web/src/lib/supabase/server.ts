import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { supabaseEnv } from "./env"

/**
 * Supabase client for server components, route handlers and server actions.
 * Create one per request. Cookie writes fail silently in server components
 * (they can't set cookies); proxy.ts refreshes the session instead.
 */
export async function createClient() {
  const { url, publishableKey } = supabaseEnv()
  const cookieStore = await cookies()
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
