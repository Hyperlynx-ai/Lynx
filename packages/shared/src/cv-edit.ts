import type { CvData } from "./cv"

/**
 * CV editing (chunk 2.5): the sections the editor and Lynx work on, and the
 * code-level guard that keeps AI edits honest (policy AI-08: Lynx never
 * invents experience). The guard runs in apps/api on every AI proposal.
 */

export const CV_SECTIONS = {
  basics: "Name and contact",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  achievements: "Achievements",
} as const

export type CvSection = keyof typeof CV_SECTIONS

/** Sections Lynx rewrites when tailoring a CV to a role. */
export const TAILOR_SECTIONS: CvSection[] = ["summary", "experience", "skills"]

export function getSection(cv: CvData, section: CvSection): unknown {
  return section === "summary" ? cv.basics.summary : cv[section]
}

export function setSection(cv: CvData, section: CvSection, content: unknown): CvData {
  if (section === "summary") {
    return { ...cv, basics: { ...cv.basics, summary: (content as string | null) ?? null } }
  }
  return { ...cv, [section]: content } as CvData
}

export type GuardResult = { content: unknown; warnings: string[] }

const norm = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim()

/** Numbers in a text ("2 million", "480 ms", "8.4", "40%"). */
const numbersIn = (text: string) => text.match(/\d+(?:[.,]\d+)*%?/g) ?? []

/** Every text field of an object or list, joined. */
function allText(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(allText).join("\n")
  if (value && typeof value === "object") return Object.values(value).map(allText).join("\n")
  return ""
}

type Keyed = Record<string, unknown>

/**
 * Keeps only entries that already existed (matched by `key`), with their
 * identity fields (employer, dates…) copied back from the original; only
 * `editable` fields may change.
 */
function guardEntries(
  before: Keyed[],
  after: Keyed[],
  key: (entry: Keyed) => string,
  editable: string[],
  noun: [singular: string, plural: string],
  warnings: string[]
): Keyed[] {
  const originals = new Map(before.map((entry) => [key(entry), entry]))
  const kept: Keyed[] = []
  let dropped = 0
  for (const entry of after) {
    const original = originals.get(key(entry))
    if (!original) {
      dropped++
      continue
    }
    const merged: Keyed = { ...original }
    for (const field of editable) merged[field] = entry[field] ?? original[field]
    kept.push(merged)
    originals.delete(key(entry))
  }
  if (dropped === 1) {
    warnings.push(`Lynx suggested a ${noun[0]} that isn't in your CV; it was left out.`)
  } else if (dropped > 1) {
    warnings.push(
      `Lynx suggested ${dropped} ${noun[1]} that aren't in your CV; they were left out.`
    )
  }
  return kept
}

/**
 * Checks an AI proposal for one section against the original CV and returns
 * a safe version plus warnings for the candidate:
 * - no new jobs, schools, projects, certifications or languages, and their
 *   names, employers and dates stay as they were;
 * - no skills that aren't already somewhere in the CV;
 * - numbers that aren't in the CV are flagged (the candidate decides).
 */
export function guardEdit(
  section: CvSection,
  before: unknown,
  after: unknown,
  cv: CvData
): GuardResult {
  const warnings: string[] = []
  const cvText = norm(allText(cv))
  let content: unknown = after

  switch (section) {
    case "basics": {
      const b = before as CvData["basics"]
      const a = after as CvData["basics"]
      content = { ...b, headline: a.headline ?? b.headline, summary: a.summary ?? b.summary }
      break
    }
    case "experience":
      content = guardEntries(
        before as Keyed[],
        after as Keyed[],
        (e) => `${norm(e.company as string)}|${norm(e.title as string)}`,
        ["highlights"],
        ["job", "jobs"],
        warnings
      )
      break
    case "education":
      content = guardEntries(
        before as Keyed[],
        after as Keyed[],
        (e) => `${norm(e.institution as string)}|${norm(e.degree as string)}`,
        ["highlights"],
        ["education entry", "education entries"],
        warnings
      )
      break
    case "projects":
      content = guardEntries(
        before as Keyed[],
        after as Keyed[],
        (e) => norm(e.name as string),
        ["highlights", "technologies"],
        ["project", "projects"],
        warnings
      )
      break
    case "certifications":
      content = guardEntries(
        before as Keyed[],
        after as Keyed[],
        (e) => norm(e.name as string),
        [],
        ["certification", "certifications"],
        warnings
      )
      break
    case "languages":
      content = guardEntries(
        before as Keyed[],
        after as Keyed[],
        (e) => norm(e.name as string),
        [],
        ["language", "languages"],
        warnings
      )
      break
    case "skills": {
      const removed: string[] = []
      content = (after as CvData["skills"])
        .map((group) => ({
          ...group,
          skills: group.skills.filter((skill) => {
            const known = cvText.includes(norm(skill))
            if (!known) removed.push(skill)
            return known
          }),
        }))
        .filter((group) => group.skills.length)
      if (removed.length) {
        warnings.push(`Left out skills that aren't in your CV: ${removed.join(", ")}.`)
      }
      break
    }
    default:
      break
  }

  // Projects' technologies are skills too.
  if (section === "projects") {
    for (const project of content as Keyed[]) {
      const tech = (project.technologies as string[]) ?? []
      project.technologies = tech.filter((t) => cvText.includes(norm(t)))
    }
  }

  const known = new Set(numbersIn(allText(cv)))
  const unknown = [...new Set(numbersIn(allText(content)))].filter((n) => !known.has(n))
  if (unknown.length) {
    warnings.push(
      `Check these numbers; they aren't in your CV: ${unknown.join(", ")}. Keep them only if they're true.`
    )
  }
  return { content, warnings }
}

const text = (value: string | null | undefined) => {
  const v = (value ?? "").trim()
  return v ? v : null
}
const lines = (values: string[]) => values.map((v) => v.trim()).filter(Boolean)
const hasAny = (entry: object) =>
  Object.values(entry).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))

/**
 * Tidies an edited CV before it's saved: trims text, turns empty fields into
 * null, drops blank lines and entries with nothing in them.
 */
export function cleanCv(cv: CvData): CvData {
  const b = cv.basics
  return {
    basics: {
      name: text(b.name),
      headline: text(b.headline),
      email: text(b.email),
      phone: text(b.phone),
      location: text(b.location),
      links: b.links
        .map((l) => ({ label: text(l.label), url: (l.url ?? "").trim() }))
        .filter((l) => l.url),
      summary: text(b.summary),
    },
    experience: cv.experience
      .map((e) => ({
        title: text(e.title),
        company: text(e.company),
        location: text(e.location),
        start: text(e.start),
        end: text(e.end),
        highlights: lines(e.highlights),
      }))
      .filter(hasAny),
    education: cv.education
      .map((e) => ({
        institution: text(e.institution),
        degree: text(e.degree),
        field: text(e.field),
        location: text(e.location),
        start: text(e.start),
        end: text(e.end),
        grade: text(e.grade),
        highlights: lines(e.highlights),
      }))
      .filter(hasAny),
    projects: cv.projects
      .map((p) => ({
        name: text(p.name),
        url: text(p.url),
        start: text(p.start),
        end: text(p.end),
        technologies: lines(p.technologies),
        highlights: lines(p.highlights),
      }))
      .filter(hasAny),
    skills: cv.skills
      .map((g) => ({ name: text(g.name), skills: lines(g.skills) }))
      .filter((g) => g.skills.length),
    certifications: cv.certifications
      .map((c) => ({
        name: (c.name ?? "").trim(),
        issuer: text(c.issuer),
        date: text(c.date),
        url: text(c.url),
      }))
      .filter((c) => c.name),
    languages: cv.languages
      .map((l) => ({ name: (l.name ?? "").trim(), level: text(l.level) }))
      .filter((l) => l.name),
    achievements: lines(cv.achievements),
  }
}
