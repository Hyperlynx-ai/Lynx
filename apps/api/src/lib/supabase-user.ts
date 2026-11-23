import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase client that acts as the signed-in user: row-level security
 * applies, so a bug in a route can't reach another user's data (ADR 0010).
 * Create one per request; never cache it across users.
 */
export function createSupabaseForUser(
  url: string,
  publishableKey: string,
  accessToken: string
): SupabaseClient {
  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
