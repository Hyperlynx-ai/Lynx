import type { SupabaseClient } from "@supabase/supabase-js"

/** One row of public.opportunity_feed (see the migration). */
export type FeedRow = {
  id: string
  title: string
  company: string | null
  location: string | null
  country: string | null
  city: string | null
  remote: boolean
  employment_type: string | null
  seniority: string | null
  field: string | null
  posted_at: string | null
  deadline: string | null
  url: string
  is_affiliated: boolean
  source_id: string
  source_name: string
  source_kind: string
  match_rank: number | null
  match_score: number | null
  match_label: string | null
  match_reason: string | null
  match_reranked: boolean | null
  saved: boolean
  total: number
}

export type FeedQuery = {
  view: "jobs" | "internships" | "scholarships"
  query?: string | undefined
  country?: string | undefined
  field?: string | undefined
  remote: boolean
  saved: boolean
  limit: number
  offset: number
}

export type MatchState = {
  requested_at: string | null
  matched_at: string | null
  matches: number
}

/** The candidate's feed, matches and saves, always as the user (RLS applies). */
export interface OpportunityStore {
  feed(query: FeedQuery): Promise<FeedRow[]>
  matchState(): Promise<MatchState | null>
  /** Returns false if there is no such job. */
  setSaved(jobId: string, state: "saved" | "hidden" | null): Promise<boolean>
}

export function createSupabaseOpportunityStore(
  db: SupabaseClient,
  userId: string
): OpportunityStore {
  return {
    async feed(q) {
      const { data, error } = await db.rpc("opportunity_feed", {
        p_view: q.view,
        p_query: q.query ?? null,
        p_country: q.country ?? null,
        p_field: q.field ?? null,
        p_remote: q.remote,
        p_saved: q.saved,
        p_limit: q.limit,
        p_offset: q.offset,
      })
      if (error) throw error
      return (data ?? []) as FeedRow[]
    },
    async matchState() {
      const { data, error } = await db
        .from("candidate_match_state")
        .select("requested_at, matched_at, matches")
        .eq("user_id", userId)
        .maybeSingle()
      if (error) throw error
      return (data as MatchState | null) ?? null
    },
    async setSaved(jobId, state) {
      if (state === null) {
        const { error } = await db
          .from("job_saves")
          .delete()
          .eq("user_id", userId)
          .eq("job_id", jobId)
        if (error) throw error
        return true
      }
      const { error } = await db
        .from("job_saves")
        .upsert({ user_id: userId, job_id: jobId, state }, { onConflict: "user_id,job_id" })
      if (error?.code === "23503") return false // no such job
      if (error) throw error
      return true
    },
  }
}
