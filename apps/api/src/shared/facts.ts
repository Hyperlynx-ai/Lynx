// GENERATED from packages/shared/src/facts.ts by scripts/shared-sync.mjs.
// Do not edit: change the original and run `pnpm shared:sync`.

import { z } from "zod"

/**
 * "What Lynx knows about you" (chunk 2.4). Values match the check
 * constraints in supabase/migrations/*_lynx_facts.sql and the facts_extract
 * task in services/ai. This file must not import other files (KL-19).
 */

export const FACT_CATEGORIES = {
  summary: "About you",
  experience: "Experience",
  education: "Education",
  skill: "Skills",
  project: "Projects",
  certification: "Certifications",
  language: "Languages",
  achievement: "Achievements",
  preference: "Preferences",
  goal: "Goals",
  personal: "Personal",
  other: "Other",
} as const

export const FACT_SOURCES = {
  cv: "From your CV",
  candidate: "You told Lynx",
  interview: "From an interview",
  chat: "From a chat with Lynx",
} as const

export type FactCategory = keyof typeof FACT_CATEGORIES
export type FactSource = keyof typeof FACT_SOURCES

export const FactCategorySchema = z.enum(
  Object.keys(FACT_CATEGORIES) as [FactCategory, ...FactCategory[]]
)

export const MAX_FACT_LENGTH = 300

/** A fact the candidate adds or edits. */
export const FactInput = z.object({
  category: FactCategorySchema,
  text: z.string().trim().min(1).max(MAX_FACT_LENGTH),
})
export type FactInput = z.infer<typeof FactInput>

/** Free text for "Tell Lynx more". */
export const TellLynxInput = z.object({ text: z.string().trim().min(3).max(2000) })

/** The parts of a structured CV that facts are read from (a subset of CvData). */
type CvLike = {
  basics: { headline?: string | null; location?: string | null }
  experience: {
    title?: string | null
    company?: string | null
    start?: string | null
    end?: string | null
  }[]
  education: {
    degree?: string | null
    field?: string | null
    institution?: string | null
    end?: string | null
  }[]
  projects: { name?: string | null; technologies: string[] }[]
  skills: { name?: string | null; skills: string[] }[]
  certifications: { name: string; issuer?: string | null }[]
  languages: { name: string; level?: string | null }[]
  achievements: string[]
}

const join = (parts: (string | null | undefined)[], sep: string) =>
  parts.filter((p): p is string => Boolean(p && p.trim())).join(sep)

const clip = (text: string) =>
  text.length > MAX_FACT_LENGTH ? `${text.slice(0, MAX_FACT_LENGTH - 1)}…` : text

/**
 * Facts read from a structured CV, in code (no AI call): one per job,
 * degree, project, skill group, certification, language and achievement.
 */
export function factsFromCv(cv: CvLike): FactInput[] {
  const facts: FactInput[] = []
  const add = (category: FactCategory, text: string) => {
    if (text.trim()) facts.push({ category, text: clip(text.trim()) })
  }
  if (cv.basics.headline) add("summary", cv.basics.headline)
  if (cv.basics.location) add("personal", `Lives in ${cv.basics.location}`)
  for (const job of cv.experience) {
    const role = join([job.title, job.company], " at ")
    const dates = join([job.start, job.end], " – ")
    if (role) add("experience", dates ? `${role} (${dates})` : role)
  }
  for (const edu of cv.education) {
    const degree = join([edu.degree, edu.field], ", ")
    const text = join([degree, edu.institution], ", ")
    if (text) add("education", edu.end ? `${text} (${edu.end})` : text)
  }
  for (const project of cv.projects) {
    if (!project.name) continue
    const tech = project.technologies.join(", ")
    add("project", tech ? `${project.name} (${tech})` : project.name)
  }
  for (const group of cv.skills) {
    if (!group.skills.length) continue
    const skills = group.skills.join(", ")
    add("skill", group.name ? `${group.name}: ${skills}` : skills)
  }
  for (const cert of cv.certifications) {
    add("certification", join([cert.name, cert.issuer], ", "))
  }
  for (const lang of cv.languages) {
    add("language", lang.level ? `${lang.name} (${lang.level})` : lang.name)
  }
  for (const achievement of cv.achievements) add("achievement", achievement)
  return facts.slice(0, 100)
}
