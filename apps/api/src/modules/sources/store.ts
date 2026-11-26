import type { SupabaseClient } from "@supabase/supabase-js"

export type SourceRow = {
  id: string
  name: string
  kind: "curated" | "api" | "ats" | "scraper"
  enabled: boolean
  notes: string | null
  run_requested_at: string | null
  last_run_at: string | null
  last_status: "ok" | "failed" | "partial" | null
  last_error: string | null
  active_jobs: number
}

export type RunRow = {
  id: number
  source_id: string
  started_at: string
  finished_at: string | null
  status: "running" | "ok" | "failed" | "partial"
  fetched: number
  kept: number
  inserted: number
  updated: number
  expired: number
  error: string | null
}

/** Job sources for the admin console (admin client: callers check the role). */
export interface SourceStore {
  list(): Promise<SourceRow[]>
  recentRuns(limit: number): Promise<RunRow[]>
  /** Returns false if the source doesn't exist. */
  setEnabled(id: string, enabled: boolean): Promise<boolean>
  requestRun(id: string): Promise<boolean>
  activeJobsTotal(): Promise<number>
}

const SOURCE_COLUMNS =
  "id, name, kind, enabled, notes, run_requested_at, last_run_at, last_status, last_error, active_jobs"

export function createSupabaseSourceStore(admin: SupabaseClient): SourceStore {
  const update = async (id: string, values: Record<string, unknown>) => {
    const { data, error } = await admin.from("job_sources").update(values).eq("id", id).select("id")
    if (error) throw error
    return (data ?? []).length > 0
  }
  return {
    async list() {
      const { data, error } = await admin
        .from("job_sources")
        .select(SOURCE_COLUMNS)
        .order("kind")
        .order("name")
      if (error) throw error
      return (data ?? []) as SourceRow[]
    },
    async recentRuns(limit) {
      const { data, error } = await admin
        .from("job_runs")
        .select(
          "id, source_id, started_at, finished_at, status, fetched, kept, inserted, updated, expired, error"
        )
        .order("started_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as RunRow[]
    },
    setEnabled: (id, enabled) => update(id, { enabled }),
    requestRun: (id) => update(id, { run_requested_at: new Date().toISOString() }),
    async activeJobsTotal() {
      const { count, error } = await admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .is("duplicate_of", null)
      if (error) throw error
      return count ?? 0
    },
  }
}

/** Applicant tracking systems with a company-board source (ats_companies.ats). */
export const ATS = ["greenhouse", "lever", "ashby", "smartrecruiters", "recruitee"] as const
export type Ats = (typeof ATS)[number]

export type CompanyRow = {
  id: string
  ats: Ats
  slug: string
  name: string
  enabled: boolean
  created_at: string
}

/** Companies whose public job boards are ingested (admin client: callers check the role). */
export interface CompanyStore {
  list(): Promise<CompanyRow[]>
  /** Returns "duplicate" if this board is already listed. */
  add(company: { ats: Ats; slug: string; name: string }): Promise<CompanyRow | "duplicate">
  /** These return false if the company doesn't exist. */
  setEnabled(id: string, enabled: boolean): Promise<boolean>
  remove(id: string): Promise<boolean>
}

const COMPANY_COLUMNS = "id, ats, slug, name, enabled, created_at"

export function createSupabaseCompanyStore(admin: SupabaseClient): CompanyStore {
  return {
    async list() {
      const { data, error } = await admin
        .from("ats_companies")
        .select(COMPANY_COLUMNS)
        .order("name")
        .order("ats")
      if (error) throw error
      return (data ?? []) as CompanyRow[]
    },
    async add(company) {
      const { data, error } = await admin
        .from("ats_companies")
        .insert(company)
        .select(COMPANY_COLUMNS)
        .single()
      if (error?.code === "23505") return "duplicate"
      if (error) throw error
      return data as CompanyRow
    },
    async setEnabled(id, enabled) {
      const { data, error } = await admin
        .from("ats_companies")
        .update({ enabled })
        .eq("id", id)
        .select("id")
      if (error) throw error
      return (data ?? []).length > 0
    },
    async remove(id) {
      const { data, error } = await admin.from("ats_companies").delete().eq("id", id).select("id")
      if (error) throw error
      return (data ?? []).length > 0
    },
  }
}
