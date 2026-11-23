import type { SupabaseClient } from "@supabase/supabase-js"

export type CandidateRow = {
  user_id: string
  target_roles: string[]
  countries: string[]
  experience_level: string | null
  education_level: string | null
  pathways: string[]
  visa_status: string | null
  current_location: string | null
  phone: string | null
  phone_is_whatsapp: boolean
  visible_to_recruiters: boolean
  show_contact_to_recruiters: boolean
  job_alerts: boolean
  newsletter: boolean
  matching_cv_version_id: string | null
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export type CandidateFields = Partial<Omit<CandidateRow, "user_id" | "created_at" | "updated_at">>

export type ConsentKind = "recruiter_visibility" | "recruiter_contact" | "job_alerts" | "newsletter"

export type ConsentRow = {
  kind: ConsentKind
  granted: boolean
  text_version: string
  created_at: string
}

/** The candidate's own profile and consent log, always as the user (RLS applies). */
export interface CandidateStore {
  get(): Promise<CandidateRow | null>
  /** Creates the row on first save, then updates it. */
  save(fields: CandidateFields): Promise<CandidateRow>
  addConsents(rows: { kind: ConsentKind; granted: boolean; text_version: string }[]): Promise<void>
  listConsents(): Promise<ConsentRow[]>
}

const COLUMNS =
  "user_id, target_roles, countries, experience_level, education_level, pathways, visa_status, current_location, phone, phone_is_whatsapp, visible_to_recruiters, show_contact_to_recruiters, job_alerts, newsletter, matching_cv_version_id, onboarded_at, created_at, updated_at"

export function createSupabaseCandidateStore(db: SupabaseClient, userId: string): CandidateStore {
  return {
    async get() {
      const { data, error } = await db
        .from("candidates")
        .select(COLUMNS)
        .eq("user_id", userId)
        .maybeSingle()
      if (error) throw error
      return (data as CandidateRow | null) ?? null
    },

    async save(fields) {
      const { data, error } = await db
        .from("candidates")
        .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" })
        .select(COLUMNS)
        .single()
      if (error) throw error
      return data as CandidateRow
    },

    async addConsents(rows) {
      if (!rows.length) return
      const { error } = await db
        .from("consents")
        .insert(rows.map((row) => ({ ...row, user_id: userId })))
      if (error) throw error
    },

    async listConsents() {
      const { data, error } = await db
        .from("consents")
        .select("kind, granted, text_version, created_at")
        .order("created_at", { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as ConsentRow[]
    },
  }
}
