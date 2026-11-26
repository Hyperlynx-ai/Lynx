"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"
import { Field } from "@lynx/ui/components/field"
import { Input } from "@lynx/ui/components/input"
import { Select } from "@lynx/ui/components/select"

import { addCompany } from "@/app/admin/companies/actions"
import { ATS_LABELS, careersUrl } from "@/lib/ats"

const ERRORS: Record<string, string> = {
  already_listed: "That board is already listed.",
  http_400: "Use the board name from the careers-page URL: letters, numbers, dots, dashes.",
}

/** Adds a company board; it's read on the next run of its system's source. */
export function CompanyForm() {
  const router = useRouter()
  const [ats, setAts] = useState("greenhouse")
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      setError(null)
      const result = await addCompany({ ats, slug: slug.trim(), name: name.trim() })
      if (!result.ok) {
        setError(ERRORS[result.error] ?? "Couldn't add the board. Try again.")
        return
      }
      setSlug("")
      setName("")
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby="add-company-heading"
      className="flex flex-col gap-gap-sm border border-border p-4"
    >
      <h2 id="add-company-heading" className="text-label text-text-primary">
        Add a company board
      </h2>
      <div className="grid gap-gap-sm md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
        <Field htmlFor="company-ats" label="System">
          <Select id="company-ats" value={ats} onChange={(e) => setAts(e.target.value)}>
            {Object.entries(ATS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          htmlFor="company-slug"
          label="Board name"
          hint={`From the careers-page URL: ${careersUrl(ats, "stripe")}`}
          error={error ?? undefined}
        >
          <Input
            id="company-slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="stripe"
            pattern="[A-Za-z0-9_.\-]{1,80}"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "company-slug-error" : "company-slug-hint"}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field htmlFor="company-name" label="Company">
          <Input
            id="company-name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Stripe"
            autoComplete="off"
          />
        </Field>
        <Button type="submit" disabled={pending} className="md:mt-7">
          {pending ? "Adding" : "Add board"}
        </Button>
      </div>
    </form>
  )
}
