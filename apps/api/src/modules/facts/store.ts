import type { SupabaseClient } from "@supabase/supabase-js"

import type { FactCategory, FactSource } from "../../shared/facts.js"

export type FactRow = {
  id: string
  category: FactCategory
  text: string
  source: FactSource
  cv_version_id: string | null
  created_at: string
  updated_at: string
}

/** What Lynx knows about the candidate, always as the user (RLS applies). */
export interface FactStore {
  list(): Promise<FactRow[]>
  count(): Promise<number>
  add(
    facts: { category: FactCategory; text: string; source: FactSource; cv_version_id?: string }[]
  ): Promise<FactRow[]>
  /** Edits a fact; it becomes the candidate's own (no longer tied to a CV). */
  update(id: string, fact: { category: FactCategory; text: string }): Promise<FactRow | null>
  remove(id: string): Promise<boolean>
  /** Replaces every fact read from a CV with those from this CV version. */
  replaceCvFacts(
    cvVersionId: string,
    facts: { category: FactCategory; text: string }[]
  ): Promise<void>
}

const COLUMNS = "id, category, text, source, cv_version_id, created_at, updated_at"

export function createSupabaseFactStore(db: SupabaseClient, userId: string): FactStore {
  const store: FactStore = {
    async list() {
      const { data, error } = await db
        .from("lynx_facts")
        .select(COLUMNS)
        .order("created_at", { ascending: true })
        .limit(1000)
      if (error) throw error
      return (data ?? []) as FactRow[]
    },

    async count() {
      const { count, error } = await db
        .from("lynx_facts")
        .select("id", { count: "exact", head: true })
      if (error) throw error
      return count ?? 0
    },

    async add(facts) {
      if (!facts.length) return []
      const { data, error } = await db
        .from("lynx_facts")
        .insert(facts.map((f) => ({ ...f, user_id: userId })))
        .select(COLUMNS)
      if (error) throw error
      return (data ?? []) as FactRow[]
    },

    async update(id, fact) {
      const { data, error } = await db
        .from("lynx_facts")
        .update({ ...fact, source: "candidate", cv_version_id: null })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle()
      if (error) throw error
      return (data as FactRow | null) ?? null
    },

    async remove(id) {
      const { data, error } = await db.from("lynx_facts").delete().eq("id", id).select("id")
      if (error) throw error
      return (data ?? []).length > 0
    },

    async replaceCvFacts(cvVersionId, facts) {
      const { error } = await db.from("lynx_facts").delete().eq("source", "cv")
      if (error) throw error
      await store.add(facts.map((f) => ({ ...f, source: "cv", cv_version_id: cvVersionId })))
    },
  }
  return store
}
