// GENERATED from packages/shared/src/cv.ts by scripts/shared-sync.mjs.
// Do not edit: change the original and run `pnpm shared:sync`.

import { z } from "zod"

/**
 * The structured CV (ADR 0010). Mirror of services/ai/lynx_ai/cv.py: change
 * both together. fixtures/cv-sample.json is checked against both.
 *
 * Every key is always present (the AI service sends nulls and empty lists),
 * so a missing key means the two schemas have drifted apart.
 */
const text = z.string().max(5000)
const optionalText = text.nullable()
const list = <T extends z.ZodTypeAny>(item: T) => z.array(item).max(100)

export const CvLink = z.object({ label: optionalText, url: text })

export const CvBasics = z.object({
  name: optionalText,
  headline: optionalText,
  email: optionalText,
  phone: optionalText,
  location: optionalText,
  links: list(CvLink),
  summary: optionalText,
})

export const CvExperience = z.object({
  title: optionalText,
  company: optionalText,
  location: optionalText,
  start: optionalText,
  end: optionalText,
  highlights: list(text),
})

export const CvEducation = z.object({
  institution: optionalText,
  degree: optionalText,
  field: optionalText,
  location: optionalText,
  start: optionalText,
  end: optionalText,
  grade: optionalText,
  highlights: list(text),
})

export const CvProject = z.object({
  name: optionalText,
  url: optionalText,
  start: optionalText,
  end: optionalText,
  technologies: list(text),
  highlights: list(text),
})

export const CvSkillGroup = z.object({ name: optionalText, skills: list(text) })

export const CvCertification = z.object({
  name: text,
  issuer: optionalText,
  date: optionalText,
  url: optionalText,
})

export const CvLanguage = z.object({ name: text, level: optionalText })

export const CvData = z.object({
  basics: CvBasics,
  experience: list(CvExperience),
  education: list(CvEducation),
  projects: list(CvProject),
  skills: list(CvSkillGroup),
  certifications: list(CvCertification),
  languages: list(CvLanguage),
  achievements: list(text),
})

export type CvData = z.infer<typeof CvData>

/** File types candidates can upload (same list as the `cvs` bucket). */
export const CV_MEDIA_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const

export type CvMediaType = keyof typeof CV_MEDIA_TYPES

/** Largest CV file accepted (same as the `cvs` bucket and services/ai). */
export const MAX_CV_BYTES = 10 * 1024 * 1024

export function isCvMediaType(value: string): value is CvMediaType {
  return Object.hasOwn(CV_MEDIA_TYPES, value)
}

/** True when the CV has nothing in it (e.g. the document wasn't a CV). */
export function isEmptyCv(cv: CvData): boolean {
  const b = cv.basics
  return (
    !b.name &&
    !b.email &&
    !b.summary &&
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.projects.length === 0 &&
    cv.skills.length === 0
  )
}
