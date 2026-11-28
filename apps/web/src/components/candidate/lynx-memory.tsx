"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"

import {
  FACT_CATEGORIES,
  FACT_SOURCES,
  MAX_FACT_LENGTH,
  type FactCategory,
} from "@lynx/shared/facts"
import { Button } from "@lynx/ui/components/button"
import { Field } from "@lynx/ui/components/field"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"
import { Select } from "@lynx/ui/components/select"
import { LoadingState } from "@lynx/ui/components/states"
import { Textarea } from "@lynx/ui/components/textarea"

import { deleteFact, tellLynx, updateFact } from "@/lib/candidate/fact-actions"
import type { Fact } from "@/lib/candidate/api"

const ERRORS: Record<string, string> = {
  daily_limit: "You've reached today's limit for telling Lynx more. Try again tomorrow.",
  too_many_facts: "Lynx already knows 500 things about you. Delete some to add more.",
  ai_failed: "Lynx couldn't read that just now. Try again in a minute.",
  ai_not_configured: "Lynx can't read this right now. Please try again later.",
}
const errorText = (code: string) => ERRORS[code] ?? "Something went wrong. Please try again."

/** "Tell Lynx more": free text that Lynx turns into facts. */
export function TellLynx() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (text.trim().length < 3) return
    setPending(true)
    setMessage(null)
    const result = await tellLynx(text)
    setPending(false)
    if (!result.ok) return setMessage({ tone: "error", text: errorText(result.error) })
    setText("")
    setMessage({
      tone: "success",
      text: result.added
        ? `Lynx noted ${result.added} new ${result.added === 1 ? "fact" : "facts"}. Check them below.`
        : "Lynx didn't find anything new to note in that.",
    })
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-gap-sm">
      <Field
        htmlFor="tell-lynx"
        label="Tell Lynx more"
        hint="Anything that helps it find the right opportunities: plans, preferences, notice period, languages you're learning…"
      >
        <Textarea
          id="tell-lynx"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          aria-describedby="tell-lynx-hint"
          placeholder="I want to move to Dubai within 6 months, and I prefer day shifts."
          disabled={pending}
        />
      </Field>
      {pending ? <LoadingState label="lynx is reading" /> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button
        type="submit"
        variant="heroSecondary"
        className="self-start"
        disabled={pending || text.trim().length < 3}
      >
        Tell Lynx
      </Button>
    </form>
  )
}

/** Facts grouped by category, each with its source; edit or delete any of them. */
export function FactList({ facts }: { facts: Fact[] }) {
  const groups = (Object.keys(FACT_CATEGORIES) as FactCategory[])
    .map((category) => ({ category, facts: facts.filter((f) => f.category === category) }))
    .filter((g) => g.facts.length)

  if (!groups.length) {
    return (
      <p className="border-t border-border py-6 text-body text-text-secondary">
        Lynx doesn&apos;t know anything about you yet. Upload your CV or tell it about yourself.
      </p>
    )
  }
  return (
    <dl className="border-t border-border">
      {groups.map((group) => (
        <div
          key={group.category}
          className="grid gap-gap-sm border-b border-border py-6 md:grid-cols-[200px_1fr] md:gap-gap-md"
        >
          <dt className="text-label text-text-secondary">{FACT_CATEGORIES[group.category]}</dt>
          <dd className="flex min-w-0 flex-col gap-gap-sm">
            {group.facts.map((fact) => (
              <FactRow key={fact.id} fact={fact} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function FactRow({ fact }: { fact: Fact }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(fact.text)
  const [category, setCategory] = useState(fact.category as FactCategory)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return setError("A fact can't be empty. Delete it instead.")
    startTransition(async () => {
      const result = await updateFact(fact.id, { category, text })
      if (!result.ok) return setError(errorText(result.error))
      setError(null)
      setEditing(false)
      router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteFact(fact.id)
      if (!result.ok) return setError(errorText(result.error))
      router.refresh()
    })
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-gap-sm border border-border p-4">
        <div className="grid gap-gap-sm md:grid-cols-[1fr_200px]">
          <Input
            aria-label="Fact"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_FACT_LENGTH}
            aria-invalid={Boolean(error)}
            autoFocus
          />
          <Select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as FactCategory)}
          >
            {Object.entries(FACT_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex gap-gap-md">
          <Button type="submit" variant="heroSecondary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={() => {
              setEditing(false)
              setText(fact.text)
              setError(null)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-gap-md">
      <p className="text-body text-text-primary">{fact.text}</p>
      <div className="flex shrink-0 items-baseline gap-gap-sm">
        <span className="text-small text-text-secondary">{FACT_SOURCES[fact.source]}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer text-label text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary"
          aria-label={`Edit: ${fact.text}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="cursor-pointer text-label text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary disabled:opacity-50"
          aria-label={`Delete: ${fact.text}`}
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  )
}
