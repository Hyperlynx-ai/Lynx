"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"

import type { CvData } from "@lynx/shared/cv"
import { cleanCv, CV_SECTIONS, setSection, type CvSection } from "@lynx/shared/cv-edit"
import { Button } from "@lynx/ui/components/button"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"
import { LoadingState } from "@lynx/ui/components/states"

import {
  aiEditSection,
  saveCvVersion,
  tailorCv,
  setMatchingCv,
  type Proposal,
} from "@/lib/cv/editor-actions"

import { ProposalView } from "./proposal-view"
import { SectionForm } from "./section-forms"

const ERRORS: Record<string, string> = {
  daily_limit: "You've reached today's limit for AI edits. You can still edit by hand.",
  ai_failed: "Lynx couldn't do that just now. Try again in a minute.",
  ai_not_configured: "Lynx can't edit CVs right now. You can still edit by hand.",
}
const errorText = (code: string) => ERRORS[code] ?? "Something went wrong. Please try again."

export type VersionInfo = {
  id: string
  version: number
  source: string
  label: string | null
  createdAt: string
}

const SOURCE_LABEL: Record<string, string> = {
  parsed: "Read from your file",
  candidate_edit: "Your edits",
  ai_edit: "Edited with Lynx",
  tailored: "Tailored",
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
})

/**
 * The CV editor: every section as a form, "Ask Lynx" per section and
 * "Tailor to a role" (proposals shown as diffs to accept or reject), then
 * "Save as a new version". Older versions can be opened, restored, and
 * chosen for matching.
 */
export function CvEditor(props: {
  cvId: string
  version: number
  initial: CvData
  versions: VersionInfo[]
  matchingVersionId: string | null
  targetRoles: string[]
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(props.initial)
  const [dirty, setDirty] = useState(false)
  const [usedAi, setUsedAi] = useState<"ai_edit" | "tailored" | null>(null)
  const [tailoredRole, setTailoredRole] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Partial<Record<CvSection, Proposal>>>({})
  const [message, setMessage] = useState<{
    tone: "error" | "success" | "info"
    text: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const latest = props.versions[0]?.version ?? props.version
  const viewingOld = props.version !== latest

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const edit = (section: CvSection, content: unknown) => {
    setDraft((cv) => setSection(cv, section, content))
    setDirty(true)
  }

  function accept(section: CvSection) {
    const proposal = proposals[section]
    if (!proposal) return
    edit(section, proposal.after)
    setUsedAi((u) => (u === "tailored" ? u : "ai_edit"))
    setProposals(({ [section]: _, ...rest }) => rest)
  }

  async function save(label: string) {
    setSaving(true)
    setMessage(null)
    const source = usedAi === "tailored" ? "tailored" : (usedAi ?? "candidate_edit")
    const result = await saveCvVersion({
      cvId: props.cvId,
      data: cleanCv(draft),
      source,
      label:
        label.trim() ||
        (source === "tailored"
          ? `Tailored for ${tailoredRole}`
          : viewingOld
            ? `Restored version ${props.version}`
            : null),
    })
    setSaving(false)
    if (!result.ok) return setMessage({ tone: "error", text: errorText(result.error) })
    setDirty(false)
    setUsedAi(null)
    router.push(`/app/cv/${props.cvId}/edit?version=${result.data.version}`)
    router.refresh()
    setMessage({ tone: "success", text: `Saved as version ${result.data.version}.` })
  }

  return (
    <div className="flex flex-col gap-gap-lg">
      {viewingOld ? (
        <Notice title={`You're looking at version ${props.version}.`}>
          Saving it creates version {latest + 1} with this content, so nothing is lost.
        </Notice>
      ) : null}

      <Tailor
        defaultRole={props.targetRoles[0] ?? ""}
        onTailor={async (role) => {
          setMessage(null)
          const result = await tailorCv({ cvId: props.cvId, version: props.version, role })
          if (!result.ok) return setMessage({ tone: "error", text: errorText(result.error) })
          setProposals((p) => ({
            ...p,
            ...Object.fromEntries(result.data.proposals.map((x) => [x.section, x])),
          }))
          setUsedAi("tailored")
          setTailoredRole(role)
          const failed = result.data.failed.map((f) => CV_SECTIONS[f.section]).join(", ")
          setMessage({
            tone: failed ? "error" : "info",
            text: failed
              ? `Lynx suggested changes below, but couldn't do: ${failed}.`
              : "Lynx suggested changes below. Accept or reject each one, then save.",
          })
        }}
      />

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="flex flex-col">
        {(Object.keys(CV_SECTIONS) as CvSection[]).map((section) => (
          <SectionCard
            key={section}
            section={section}
            draft={draft}
            proposal={proposals[section]}
            onChange={(content) => edit(section, content)}
            onAsk={async (instruction) => {
              const result = await aiEditSection({
                cvId: props.cvId,
                version: props.version,
                section,
                instruction,
                targetRole: props.targetRoles[0],
              })
              if (!result.ok) return errorText(result.error)
              setProposals((p) => ({ ...p, [section]: result.data }))
              return null
            }}
            onAccept={() => accept(section)}
            onReject={() => setProposals(({ [section]: _, ...rest }) => rest)}
          />
        ))}
      </div>

      <SaveBar dirty={dirty || viewingOld} saving={saving} nextVersion={latest + 1} onSave={save} />

      <Versions
        cvId={props.cvId}
        current={props.version}
        versions={props.versions}
        matchingVersionId={props.matchingVersionId}
        onError={(text) => setMessage({ tone: "error", text })}
      />
    </div>
  )
}

function Tailor({
  defaultRole,
  onTailor,
}: {
  defaultRole: string
  onTailor: (role: string) => Promise<void>
}) {
  const [role, setRole] = useState(defaultRole)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (role.trim().length < 2) return
    setPending(true)
    await onTailor(role.trim())
    setPending(false)
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-gap-sm border border-border p-6">
      <label htmlFor="tailor-role" className="text-label text-text-primary">
        Tailor your CV to a role
      </label>
      <p className="text-body text-text-secondary">
        Lynx reorders and sharpens your summary, experience and skills for the role, using only
        what&apos;s already in your CV.
      </p>
      <div className="flex flex-col gap-gap-sm sm:flex-row">
        <Input
          id="tailor-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Payments Backend Engineer"
          maxLength={120}
          className="sm:max-w-md"
        />
        <Button type="submit" variant="heroSecondary" disabled={pending || role.trim().length < 2}>
          {pending ? "Tailoring…" : "Tailor"}
        </Button>
      </div>
      {pending ? <LoadingState label="lynx is tailoring your cv, about a minute" /> : null}
    </form>
  )
}

function SectionCard(props: {
  section: CvSection
  draft: CvData
  proposal: Proposal | undefined
  onChange: (content: unknown) => void
  onAsk: (instruction: string) => Promise<string | null>
  onAccept: () => void
  onReject: () => void
}) {
  const [asking, setAsking] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = `ask-${props.section}`

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (instruction.trim().length < 3) return
    setPending(true)
    setError(null)
    const failure = await props.onAsk(instruction.trim())
    setPending(false)
    if (failure) return setError(failure)
    setAsking(false)
    setInstruction("")
  }

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      className="flex flex-col gap-gap-sm border-t border-border py-gap-md"
    >
      <div className="flex items-baseline justify-between gap-gap-md">
        <h2 id={`${inputId}-heading`} className="text-label text-text-primary">
          {CV_SECTIONS[props.section]}
        </h2>
        {props.section !== "basics" ? (
          <button
            type="button"
            onClick={() => setAsking((a) => !a)}
            className="cursor-pointer font-mono text-mono text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary"
            aria-expanded={asking}
            aria-controls={inputId}
          >
            {asking ? "close" : "ask lynx →"}
          </button>
        ) : null}
      </div>

      {asking ? (
        <form onSubmit={ask} className="flex flex-col gap-gap-sm sm:flex-row">
          <label htmlFor={inputId} className="sr-only">
            What should Lynx change in {CV_SECTIONS[props.section]}?
          </label>
          <Input
            id={inputId}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Make the bullet points more specific"
            maxLength={500}
            autoFocus
          />
          <Button
            type="submit"
            variant="heroSecondary"
            disabled={pending || instruction.trim().length < 3}
          >
            {pending ? "Asking…" : "Ask"}
          </Button>
        </form>
      ) : null}
      {pending ? <LoadingState label="lynx is editing" /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {props.proposal ? (
        <ProposalView
          section={props.section}
          before={props.proposal.before}
          after={props.proposal.after}
          explanation={props.proposal.explanation}
          warnings={props.proposal.warnings}
          onAccept={props.onAccept}
          onReject={props.onReject}
        />
      ) : null}

      <SectionForm section={props.section} cv={props.draft} onChange={props.onChange} />
    </section>
  )
}

function SaveBar(props: {
  dirty: boolean
  saving: boolean
  nextVersion: number
  onSave: (label: string) => void
}) {
  const [label, setLabel] = useState("")
  if (!props.dirty) return null
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-gap-sm border-t border-border bg-background py-4 sm:flex-row sm:items-center">
      <p className="font-mono text-mono text-text-secondary">unsaved changes</p>
      <label htmlFor="version-label" className="sr-only">
        Name this version (optional)
      </label>
      <Input
        id="version-label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name this version (optional)"
        maxLength={120}
        className="sm:max-w-sm"
      />
      <Button
        type="button"
        variant="heroPrimary"
        disabled={props.saving}
        onClick={() => props.onSave(label)}
      >
        {props.saving ? "Saving…" : `Save as version ${props.nextVersion}`}
      </Button>
    </div>
  )
}

function Versions(props: {
  cvId: string
  current: number
  versions: VersionInfo[]
  matchingVersionId: string | null
  onError: (text: string) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState<number | null>(null)
  // Without an explicit choice, the newest version Lynx read is used.
  const matching = props.matchingVersionId ?? props.versions.at(-1)?.id

  async function choose(version: number) {
    setPending(version)
    const result = await setMatchingCv(props.cvId, version)
    setPending(null)
    if (!result.ok) return props.onError(errorText(result.error))
    router.refresh()
  }

  return (
    <section aria-labelledby="versions-heading" className="flex flex-col gap-gap-sm">
      <h2 id="versions-heading" className="text-label text-text-primary">
        Versions
      </h2>
      <p className="text-body text-text-secondary">
        Every save is kept. The version used for matching is what Lynx shows recruiters and ranks
        opportunities with.
      </p>
      <ul className="border-t border-border">
        {props.versions.map((v) => (
          <li
            key={v.id}
            className="flex flex-col gap-gap-sm border-b border-border py-4 md:flex-row md:items-center md:justify-between"
          >
            <p className="text-body text-text-primary">
              <span className="font-mono text-mono text-text-secondary">v{v.version} · </span>
              {v.label ?? SOURCE_LABEL[v.source] ?? v.source}
              <span className="font-mono text-mono text-text-secondary">
                {" "}
                · {dateFormat.format(new Date(v.createdAt))}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-gap-md">
              {v.id === matching ? (
                <span className="flex items-center gap-2 font-mono text-mono text-text-primary">
                  <span aria-hidden="true" className="size-2 rounded-pill bg-accent" />
                  used for matching
                </span>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  disabled={pending !== null}
                  onClick={() => void choose(v.version)}
                >
                  {pending === v.version ? "Saving…" : "Use for matching"}
                </Button>
              )}
              {v.version === props.current ? (
                <span className="font-mono text-mono text-text-secondary">open</span>
              ) : (
                <Link
                  href={`/app/cv/${props.cvId}/edit?version=${v.version}`}
                  className="text-label text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary"
                >
                  Open
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
