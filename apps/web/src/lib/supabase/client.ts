import { createBrowserClient } from "@supabase/ssr"

import { supabaseEnv } from "./env"

/** Supabase client for client components (login forms, settings). */
export function createClient() {
  const { url, publishableKey } = supabaseEnv()
  return createBrowserClient(url, publishableKey)
}
