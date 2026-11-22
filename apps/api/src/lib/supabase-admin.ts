import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase client with the secret key. It bypasses row-level security, so
 * every route using it must check permissions first (policy SEC-02).
 * Server-only: never expose the key or this client to the browser.
 */
export function createSupabaseAdmin(url: string, secretKey: string): SupabaseClient {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
