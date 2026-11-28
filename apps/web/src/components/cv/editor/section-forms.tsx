"use client"

import { useId } from "react"

import type { CvData } from "@lynx/shared/cv"
import type { CvSection } from "@lynx/shared/cv-edit"
import { Button } from "@lynx/ui/components/button"
import { Input } from "@lynx/ui/components/input"
import { Textarea } from "@lynx/ui/components/textarea"
import { cn } from "@lynx/ui/lib/utils"

type Kind = "text" | "lines" | "csv"
type FieldSpec = { key: string; label: string; kind?: Kind; wide?: boolean }
type Entry = Record<string, unknown>

/** The form fields of each list section (labels the candidate sees). */
const LIST_FIELDS: Partial<Record<CvSection, { fields: FieldSpec[]; noun: string }>> = {
  experience: {
    noun: "job",
    fields: [
      { key: "title", label: "Job title" },
      { key: "company", label: "Company" },
      { key: "location", label: "Location" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
      { key: "highlights", label: "Bullet points (one per line)", kind: "lines", wide: true },
    ],
  },
  education: {
    noun: "education entry",
    fields: [
      { key: "institution", label: "School or university" },
      { key: "degree", label: "Degree" },
      { key: "field", label: "Field of study" },
      { key: "location", label: "Location" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
      { key: "grade", label: "Grade" },
      { key: "highlights", label: "Details (one per line)", kind: "lines", wide: true },
    ],
  },
  projects: {
    noun: "project",
    fields: [
      { key: "name", label: "Project" },
      { key: "url", label: "Link" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
      { key: "technologies", label: "Technologies (comma separated)", kind: "csv", wide: true },
      { key: "highlights", label: "Bullet points (one per line)", kind: "lines", wide: true },
    ],
  },
  skills: {
    noun: "skill group",
    fields: [
      { key: "name", label: "Group (optional)" },
      { key: "skills", label: "Skills (comma separated)", kind: "csv", wide: true },
    ],
  },
  certifications: {
    noun: "certification",
    fields: [
      { key: "name", label: "Certification" },
      { key: "issuer", label: "Issuer" },
      { key: "date", label: "Date" },
      { key: "url", label: "Link" },
    ],
  },
  languages: {
    noun: "language",
    fields: [
      { key: "name", label: "Language" },
      { key: "level", label: "Level" },
    ],
  },
}

const EMPTY: Record<string, Entry> = {
  experience: {
    title: null,
    company: null,
    location: null,
    start: null,
    end: null,
    highlights: [],
  },
  education: {
    institution: null,
    degree: null,
    field: null,
    location: null,
    start: null,
    end: null,
    grade: null,
    highlights: [],
  },
  projects: { name: null, url: null, start: null, end: null, technologies: [], highlights: [] },
  skills: { name: null, skills: [] },
  certifications: { name: "", issuer: null, date: null, url: null },
  languages: { name: "", level: null },
}

function toInput(value: unknown, kind: Kind): string {
  if (kind === "lines") return ((value as string[]) ?? []).join("\n")
  if (kind === "csv") return ((value as string[]) ?? []).join(", ")
  return (value as string | null) ?? ""
}

function fromInput(text: string, kind: Kind): unknown {
  if (kind === "lines") return text.split("\n")
  if (kind === "csv") return text.split(",").map((s) => s.trimStart())
  return text
}

/** The form for one section of the CV. Changes go straight into the draft. */
export function SectionForm({
  section,
  cv,
  onChange,
}: {
  section: CvSection
  cv: CvData
  onChange: (content: unknown) => void
}) {
  const id = useId()
  if (section === "summary") {
    return (
      <Textarea
        aria-label="Summary"
        value={cv.basics.summary ?? ""}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        className="min-h-36"
      />
    )
  }
  if (section === "achievements") {
    return (
      <Textarea
        aria-label="Achievements, one per line"
        value={cv.achievements.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    )
  }
  if (section === "basics") {
    const b = cv.basics
    const set = (key: string, value: unknown) => onChange({ ...b, [key]: value })
    return (
      <div className="flex flex-col gap-gap-sm">
        <div className="grid gap-gap-sm md:grid-cols-2">
          {(
            [
              ["name", "Name"],
              ["headline", "Headline"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
            ] as const
          ).map(([key, label]) => (
            <LabeledInput
              key={key}
              id={`${id}-${key}`}
              label={label}
              value={b[key] ?? ""}
              onChange={(v) => set(key, v)}
            />
          ))}
        </div>
        <EntryList
          noun="link"
          items={b.links as Entry[]}
          fields={[
            { key: "label", label: "Label (e.g. LinkedIn)" },
            { key: "url", label: "URL" },
          ]}
          empty={{ label: null, url: "" }}
          onChange={(links) => set("links", links)}
        />
      </div>
    )
  }
  const spec = LIST_FIELDS[section]!
  return (
    <EntryList
      noun={spec.noun}
      items={cv[section] as unknown as Entry[]}
      fields={spec.fields}
      empty={EMPTY[section]!}
      onChange={onChange}
    />
  )
}

function LabeledInput(props: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={props.id} className="text-small text-text-secondary">
        {props.label}
      </label>
      <Input id={props.id} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  )
}

/** Ruled boxes of fields, one per entry, with move up/down, remove and add. */
function EntryList(props: {
  noun: string
  items: Entry[]
  fields: FieldSpec[]
  empty: Entry
  onChange: (items: Entry[]) => void
}) {
  const id = useId()
  const { items, onChange } = props
  const update = (i: number, key: string, value: unknown) =>
    onChange(items.map((item, j) => (j === i ? { ...item, [key]: value } : item)))
  const move = (i: number, by: number) => {
    const next = [...items]
    const [item] = next.splice(i, 1)
    next.splice(i + by, 0, item!)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-gap-sm">
      {items.map((item, i) => (
        <fieldset key={i} className="flex flex-col gap-gap-sm border border-border p-4">
          <legend className="sr-only">
            {props.noun} {i + 1}
          </legend>
          <div className="grid gap-gap-sm md:grid-cols-2">
            {props.fields.map((field) => {
              const kind = field.kind ?? "text"
              const inputId = `${id}-${i}-${field.key}`
              const value = toInput(item[field.key], kind)
              return (
                <div
                  key={field.key}
                  className={cn("flex flex-col gap-1", field.wide && "md:col-span-2")}
                >
                  <label htmlFor={inputId} className="text-small text-text-secondary">
                    {field.label}
                  </label>
                  {kind === "lines" ? (
                    <Textarea
                      id={inputId}
                      value={value}
                      onChange={(e) => update(i, field.key, fromInput(e.target.value, kind))}
                    />
                  ) : (
                    <Input
                      id={inputId}
                      value={value}
                      onChange={(e) => update(i, field.key, fromInput(e.target.value, kind))}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-gap-md">
            <Button type="button" variant="link" disabled={i === 0} onClick={() => move(i, -1)}>
              Move up
            </Button>
            <Button
              type="button"
              variant="link"
              disabled={i === items.length - 1}
              onClick={() => move(i, 1)}
            >
              Move down
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="link"
        className="self-start"
        onClick={() => onChange([...items, { ...props.empty }])}
      >
        + Add {props.noun}
      </Button>
    </div>
  )
}
