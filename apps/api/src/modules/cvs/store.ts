import type { SupabaseClient } from "@supabase/supabase-js"

import type { CvData } from "@lynx/shared/cv"

export type CvStatus = "uploaded" | "parsing" | "parsed" | "failed" | "not_a_cv"
export type CvVersionSource = "parsed" | "ai_edit" | "candidate_edit" | "tailored"

export type CvRow = {
  id: string
  user_id: string
  storage_path: string
  file_name: string
  media_type: string
  size_bytes: number | null
  status: CvStatus
  created_at: string
  updated_at: string
}

export type CvVersionSummary = {
  id: string
  cv_id: string
  version: number
  source: CvVersionSource
  label: string | null
  created_at: string
}

export type CvVersionRow = CvVersionSummary & { data: CvData }

/**
 * Everything the CV routes read or write, always as the signed-in user
 * (row-level security applies). Tests use an in-memory version.
 */
export interface CvStore {
  /** Signed download URL for one of the user's files; null if it doesn't exist. */
  signedUrl(path: string, seconds: number): Promise<string | null>
  removeFile(path: string): Promise<void>
  insertCv(input: {
    storage_path: string
    file_name: string
    media_type: string
    size_bytes: number | null
    status: CvStatus
  }): Promise<CvRow>
  listCvs(): Promise<CvRow[]>
  getCv(id: string): Promise<CvRow | null>
  setStatus(id: string, status: CvStatus): Promise<void>
  deleteCv(id: string): Promise<void>
  listVersions(cvId: string): Promise<CvVersionSummary[]>
  /** One version, or the latest when `version` is omitted. */
  getVersion(cvId: string, version?: number): Promise<CvVersionRow | null>
  addVersion(
    cvId: string,
    input: { source: CvVersionSource; label: string | null; data: CvData }
  ): Promise<CvVersionRow>
}

const CV_COLUMNS =
  "id, user_id, storage_path, file_name, media_type, size_bytes, status, created_at, updated_at"
const VERSION_COLUMNS = "id, cv_id, version, source, label, created_at"

/** CvStore backed by Supabase, using a client that acts as the user. */
export function createSupabaseCvStore(db: SupabaseClient, userId: string): CvStore {
  const bucket = () => db.storage.from("cvs")

  const store: CvStore = {
    async signedUrl(path, seconds) {
      const { data, error } = await bucket().createSignedUrl(path, seconds)
      if (error || !data) return null
      return data.signedUrl
    },

    async removeFile(path) {
      const { error } = await bucket().remove([path])
      if (error) throw error
    },

    async insertCv(input) {
      const { data, error } = await db
        .from("cvs")
        .insert({ ...input, user_id: userId })
        .select(CV_COLUMNS)
        .single()
      if (error) throw error
      return data as CvRow
    },

    async listCvs() {
      const { data, error } = await db
        .from("cvs")
        .select(CV_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as CvRow[]
    },

    async getCv(id) {
      const { data, error } = await db.from("cvs").select(CV_COLUMNS).eq("id", id).maybeSingle()
      if (error) throw error
      return (data as CvRow | null) ?? null
    },

    async setStatus(id, status) {
      const { error } = await db.from("cvs").update({ status }).eq("id", id)
      if (error) throw error
    },

    async deleteCv(id) {
      const { error } = await db.from("cvs").delete().eq("id", id)
      if (error) throw error
    },

    async listVersions(cvId) {
      const { data, error } = await db
        .from("cv_versions")
        .select(VERSION_COLUMNS)
        .eq("cv_id", cvId)
        .order("version", { ascending: false })
      if (error) throw error
      return (data ?? []) as CvVersionSummary[]
    },

    async getVersion(cvId, version) {
      let query = db.from("cv_versions").select(`${VERSION_COLUMNS}, data`).eq("cv_id", cvId)
      query =
        version === undefined
          ? query.order("version", { ascending: false }).limit(1)
          : query.eq("version", version)
      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return (data as CvVersionRow | null) ?? null
    },

    async addVersion(cvId, input) {
      // Retry once if two saves race for the same version number.
      for (let attempt = 0; ; attempt++) {
        const latest = await store.listVersions(cvId)
        const version = (latest[0]?.version ?? 0) + 1
        const { data, error } = await db
          .from("cv_versions")
          .insert({ cv_id: cvId, user_id: userId, version, ...input })
          .select(`${VERSION_COLUMNS}, data`)
          .single()
        if (!error) return data as CvVersionRow
        if (error.code !== "23505" || attempt > 0) throw error
      }
    },
  }
  return store
}
