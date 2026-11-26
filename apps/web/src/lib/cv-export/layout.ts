import type { CvData } from "@lynx/shared/cv"

/**
 * CV export (chunk 2.6): the CV as a simple, ordered layout that both the PDF
 * and the Word renderers draw, so all formats and templates say the same
 * thing in the same order.
 */

export const CV_TEMPLATES = {
  classic: {
    label: "Classic",
    description: 'ATS-friendly serif layout, like the popular "Jake\'s Resume".',
  },
  modern: {
    label: "Modern",
    description: "Clean sans-serif with a bold name and accent rules.",
  },
  compact: {
    label: "Compact",
    description: "Smaller type and tighter spacing to fit more on one page.",
  },
} as const

export type CvTemplate = keyof typeof CV_TEMPLATES

export type LayoutEntry = {
  /** Bold left text, e.g. "Software Engineer II". */
  title: string
  /** Right-aligned text, e.g. "Jul 2023 – Present". */
  right: string
  /** Second line, left: e.g. company. */
  subtitle: string
  /** Second line, right: e.g. location. */
  subtitleRight: string
  bullets: string[]
}

export type LayoutSection =
  | { title: string; kind: "text"; text: string }
  | { title: string; kind: "entries"; entries: LayoutEntry[] }
  | { title: string; kind: "lines"; lines: { label: string | null; text: string }[] }
  | { title: string; kind: "bullets"; bullets: string[] }

export type CvLayout = {
  name: string
  headline: string | null
  /** Contact items: email, phone, location, links. */
  contact: string[]
  sections: LayoutSection[]
}

const join = (parts: (string | null | undefined)[], sep: string) =>
  parts.filter((p): p is string => Boolean(p && p.trim())).join(sep)
const dates = (start?: string | null, end?: string | null) => join([start, end], " – ")

export function buildLayout(cv: CvData): CvLayout {
  const b = cv.basics
  const sections: LayoutSection[] = []

  if (b.summary) sections.push({ title: "Summary", kind: "text", text: b.summary })
  if (cv.experience.length) {
    sections.push({
      title: "Experience",
      kind: "entries",
      entries: cv.experience.map((job) => ({
        title: job.title ?? job.company ?? "",
        right: dates(job.start, job.end),
        subtitle: job.title ? (job.company ?? "") : "",
        subtitleRight: job.location ?? "",
        bullets: job.highlights,
      })),
    })
  }
  if (cv.education.length) {
    sections.push({
      title: "Education",
      kind: "entries",
      entries: cv.education.map((edu) => ({
        title: edu.institution ?? join([edu.degree, edu.field], ", "),
        right: dates(edu.start, edu.end),
        subtitle: join([join([edu.degree, edu.field], ", "), edu.grade], " · "),
        subtitleRight: edu.location ?? "",
        bullets: edu.highlights,
      })),
    })
  }
  if (cv.projects.length) {
    sections.push({
      title: "Projects",
      kind: "entries",
      entries: cv.projects.map((project) => ({
        title: project.name ?? "",
        right: dates(project.start, project.end),
        subtitle: project.technologies.join(", "),
        subtitleRight: project.url ?? "",
        bullets: project.highlights,
      })),
    })
  }
  if (cv.skills.length) {
    sections.push({
      title: "Skills",
      kind: "lines",
      lines: cv.skills.map((group) => ({ label: group.name, text: group.skills.join(", ") })),
    })
  }
  if (cv.certifications.length) {
    sections.push({
      title: "Certifications",
      kind: "lines",
      lines: cv.certifications.map((cert) => ({
        label: null,
        text: join([cert.name, cert.issuer, cert.date], " · "),
      })),
    })
  }
  if (cv.languages.length) {
    sections.push({
      title: "Languages",
      kind: "lines",
      lines: [
        {
          label: null,
          text: cv.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", "),
        },
      ],
    })
  }
  if (cv.achievements.length) {
    sections.push({ title: "Achievements", kind: "bullets", bullets: cv.achievements })
  }

  return {
    name: b.name ?? "Your name",
    headline: b.headline,
    contact: [b.email, b.phone, b.location, ...b.links.map((l) => l.url)].filter((c): c is string =>
      Boolean(c)
    ),
    sections,
  }
}

/** A safe file name for the download, e.g. "Aarav Sharma CV.pdf". */
export function exportFileName(cv: CvData, extension: "pdf" | "docx"): string {
  const name = (cv.basics.name ?? "My").replace(/[^\p{L}\p{N} .'-]/gu, "").trim() || "My"
  return `${name} CV.${extension}`
}
