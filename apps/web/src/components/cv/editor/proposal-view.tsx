"use client"

import { diffWords } from "diff"

import type { CvData } from "@lynx/shared/cv"
import type { CvSection } from "@lynx/shared/cv-edit"
import { Button } from "@lynx/ui/components/button"
import { Notice } from "@lynx/ui/components/notice"

const dates = (start?: string | null, end?: string | null) =>
  [start, end].filter(Boolean).join(" – ")
const line = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ")

/** A section as plain text, so two versions can be compared word by word. */
export function sectionText(section: CvSection, content: unknown): string {
  if (content == null) return ""
  switch (section) {
    case "summary":
      return String(content)
    case "basics": {
      const b = content as CvData["basics"]
      return [b.name, b.headline, line(b.email, b.phone, b.location), b.summary]
        .filter(Boolean)
        .join("\n")
    }
    case "experience":
      return (content as CvData["experience"])
        .map((j) =>
          [
            `${line(j.title, j.company)} (${dates(j.start, j.end)})`,
            ...j.highlights.map((h) => `- ${h}`),
          ].join("\n")
        )
        .join("\n\n")
    case "education":
      return (content as CvData["education"])
        .map((e) =>
          [
            line(e.degree, e.field, e.institution, dates(e.start, e.end)),
            ...e.highlights.map((h) => `- ${h}`),
          ].join("\n")
        )
        .join("\n\n")
    case "projects":
      return (content as CvData["projects"])
        .map((p) =>
          [line(p.name, p.technologies.join(", ")), ...p.highlights.map((h) => `- ${h}`)].join("\n")
        )
        .join("\n\n")
    case "skills":
      return (content as CvData["skills"])
        .map((g) => (g.name ? `${g.name}: ${g.skills.join(", ")}` : g.skills.join(", ")))
        .join("\n")
    case "certifications":
      return (content as CvData["certifications"])
        .map((c) => line(c.name, c.issuer, c.date))
        .join("\n")
    case "languages":
      return (content as CvData["languages"]).map((l) => line(l.name, l.level)).join("\n")
    case "achievements":
      return (content as string[]).map((a) => `- ${a}`).join("\n")
  }
}

/**
 * Lynx's proposal for one section: a word-level diff (removed words struck
 * through in gray, added words underlined in mint), the explanation, any
 * warnings from the honesty checks, and Accept / Reject.
 */
export function ProposalView(props: {
  section: CvSection
  before: unknown
  after: unknown
  explanation: string
  warnings: string[]
  onAccept: () => void
  onReject: () => void
}) {
  const parts = diffWords(
    sectionText(props.section, props.before),
    sectionText(props.section, props.after)
  )
  const changed = parts.some((p) => p.added || p.removed)

  return (
    <div
      className="flex flex-col gap-gap-sm border border-border p-4"
      aria-label="Lynx's suggestion"
    >
      <p className="font-mono text-mono text-accent">lynx suggests</p>
      <p className="text-body text-text-secondary">{props.explanation}</p>
      {changed ? (
        <p className="text-body whitespace-pre-wrap text-text-primary">
          {parts.map((part, i) =>
            part.removed ? (
              <del key={i} className="text-text-secondary line-through">
                {part.value}
              </del>
            ) : part.added ? (
              <ins key={i} className="underline decoration-accent decoration-2 underline-offset-4">
                {part.value}
              </ins>
            ) : (
              <span key={i}>{part.value}</span>
            )
          )}
        </p>
      ) : (
        <p className="text-body text-text-secondary">No changes suggested.</p>
      )}
      {props.warnings.length ? (
        <Notice title="Check before accepting">
          <ul className="flex flex-col gap-1">
            {props.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-gap-md">
        {changed ? (
          <Button type="button" variant="heroSecondary" onClick={props.onAccept}>
            Accept
          </Button>
        ) : null}
        <Button type="button" variant="link" onClick={props.onReject}>
          {changed ? "Reject" : "Close"}
        </Button>
      </div>
    </div>
  )
}
