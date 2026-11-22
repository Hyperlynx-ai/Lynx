import type { SupabaseClient } from "@supabase/supabase-js"

/** How long after sign-up an account may still become a recruiter account. */
export const CLAIM_WINDOW_MS = 15 * 60 * 1000

/** Why a claim was refused. (Success is `null`.) */
export type ClaimFailure =
  | { status: 409; error: "existing_account" | "not_allowed" }
  | { status: 422; error: "work_email_required"; newAccount: true }
  | { status: 404; error: "profile_not_found" }

/**
 * Google sign-up from a recruiter page creates the account first (Supabase
 * can't pass a role through Google), so it starts as a candidate account.
 * This upgrades it to a recruiter account, but only when it was created in
 * the last few minutes and the email is a work address.
 *
 * Returns null on success, or why it was refused.
 */
export async function claimRecruiterRole(
  supabase: SupabaseClient,
  user: { id: string; email: string | null },
  now = Date.now()
): Promise<ClaimFailure | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, created_at")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!profile) return { status: 404, error: "profile_not_found" }

  if (profile.role === "recruiter") return null
  if (profile.role !== "candidate") return { status: 409, error: "not_allowed" }

  const age = now - new Date(String(profile.created_at)).getTime()
  if (!(age >= 0 && age < CLAIM_WINDOW_MS)) {
    return { status: 409, error: "existing_account" }
  }
  // The database's free_email_domains list is the authority (see supabase/migrations).
  const { data: isFree, error: rpcError } = user.email
    ? await supabase.rpc("is_free_email", { email: user.email })
    : { data: true, error: null }
  if (rpcError) throw rpcError
  if (isFree !== false) {
    return { status: 422, error: "work_email_required", newAccount: true }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "recruiter" })
    .eq("id", user.id)
  if (updateError) throw updateError
  return null
}
