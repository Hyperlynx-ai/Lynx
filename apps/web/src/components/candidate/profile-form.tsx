"use client"

import { useState, type FormEvent } from "react"

import {
  CandidateProfileInput,
  COUNTRIES,
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  PATHWAYS,
  VISA_STATUSES,
} from "@lynx/shared/candidate"
import { Button } from "@lynx/ui/components/button"
import { Checkbox } from "@lynx/ui/components/checkbox"
import { Field } from "@lynx/ui/components/field"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"
import { Select } from "@lynx/ui/components/select"

import { saveProfile } from "@/lib/candidate/actions"

export type ProfileFormValues = {
  targetRoles: string[]
  countries: string[]
  experienceLevel: string | null
  educationLevel: string | null
  pathways: string[]
  visaStatus: string | null
  currentLocation: string | null
  phone: string | null
  phoneIsWhatsapp: boolean
}

type FieldName = keyof ProfileFormValues

/** Country groups, so 35 checkboxes stay scannable. */
const REGIONS: { name: string; codes: (keyof typeof COUNTRIES)[] }[] = [
  { name: "Gulf", codes: ["AE", "SA", "QA", "OM", "KW", "BH"] },
  {
    name: "Europe",
    codes: [
      "DE",
      "NL",
      "IE",
      "GB",
      "FR",
      "BE",
      "LU",
      "AT",
      "CH",
      "PL",
      "CZ",
      "SE",
      "FI",
      "DK",
      "NO",
      "IT",
      "ES",
      "PT",
      "EE",
      "MT",
      "CY",
    ],
  },
  { name: "Asia-Pacific", codes: ["SG", "MY", "JP", "AU", "NZ"] },
  { name: "Americas and home", codes: ["CA", "US", "IN"] },
]

const MESSAGES: Partial<Record<FieldName, string>> = {
  targetRoles: "Add at least one role (up to 5, separated by commas).",
  countries: "Choose at least one country (up to 10).",
  experienceLevel: "Choose your experience.",
  educationLevel: "Choose your highest education.",
  pathways: "Choose at least one.",
  visaStatus: "Choose one.",
  phone: "Use digits, spaces and an optional + country code.",
}

/**
 * The candidate's answers: roles, countries, experience, education,
 * pathway, visa status, location and phone. Used in onboarding step 2 and
 * on the profile page.
 */
export function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: ProfileFormValues
  submitLabel: string
  onSaved: () => void
}) {
  const [values, setValues] = useState(initial)
  const [rolesText, setRolesText] = useState(initial.targetRoles.join(", "))
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = <K extends FieldName>(key: K, value: ProfileFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))
  const toggle = (key: "countries" | "pathways", value: string, on: boolean) =>
    setValues((v) => ({
      ...v,
      [key]: on ? [...v[key], value] : v[key].filter((x) => x !== value),
    }))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSaved(false)
    const candidate = {
      ...values,
      targetRoles: rolesText
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      currentLocation: values.currentLocation?.trim() || null,
      phone: values.phone?.trim() || null,
    }
    const parsed = CandidateProfileInput.safeParse(candidate)
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldName
        next[key] ??= MESSAGES[key] ?? issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setPending(true)
    const result = await saveProfile(parsed.data)
    setPending(false)
    if (!result.ok) return setFormError("We couldn't save your answers. Please try again.")
    setSaved(true)
    onSaved()
  }

  const describedBy = (name: FieldName, hint = false) =>
    errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-3xl flex-col gap-gap-md">
      <Field
        htmlFor="targetRoles"
        label="Roles you're looking for"
        hint="Up to 5, separated by commas. For example: ICU Nurse, Staff Nurse"
        error={errors.targetRoles}
      >
        <Input
          id="targetRoles"
          value={rolesText}
          onChange={(e) => setRolesText(e.target.value)}
          aria-invalid={Boolean(errors.targetRoles)}
          aria-describedby={describedBy("targetRoles", true)}
          maxLength={420}
        />
      </Field>

      <fieldset
        className="flex flex-col gap-gap-sm"
        aria-describedby={describedBy("countries")}
        aria-invalid={Boolean(errors.countries)}
      >
        <legend className="mb-2 text-label text-text-primary">Countries you want to work in</legend>
        {REGIONS.map((region) => (
          <div key={region.name} className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="font-mono text-mono text-text-secondary">{region.name}</p>
            <div className="grid grid-cols-1 gap-x-gap-md gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {region.codes.map((code) => (
                <Checkbox
                  key={code}
                  label={COUNTRIES[code]}
                  checked={values.countries.includes(code)}
                  onChange={(e) => toggle("countries", code, e.target.checked)}
                />
              ))}
            </div>
          </div>
        ))}
        {errors.countries ? <FieldError id="countries-error">{errors.countries}</FieldError> : null}
      </fieldset>

      <div className="grid gap-gap-md md:grid-cols-2">
        <Field htmlFor="experienceLevel" label="Work experience" error={errors.experienceLevel}>
          <Select
            id="experienceLevel"
            value={values.experienceLevel ?? ""}
            onChange={(e) => set("experienceLevel", e.target.value || null)}
            aria-invalid={Boolean(errors.experienceLevel)}
            aria-describedby={describedBy("experienceLevel")}
          >
            <option value="">Choose…</option>
            {Object.entries(EXPERIENCE_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="educationLevel" label="Highest education" error={errors.educationLevel}>
          <Select
            id="educationLevel"
            value={values.educationLevel ?? ""}
            onChange={(e) => set("educationLevel", e.target.value || null)}
            aria-invalid={Boolean(errors.educationLevel)}
            aria-describedby={describedBy("educationLevel")}
          >
            <option value="">Choose…</option>
            {Object.entries(EDUCATION_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={describedBy("pathways")}
        aria-invalid={Boolean(errors.pathways)}
      >
        <legend className="mb-2 text-label text-text-primary">What are you looking for?</legend>
        {Object.entries(PATHWAYS).map(([value, label]) => (
          <Checkbox
            key={value}
            label={label}
            checked={values.pathways.includes(value)}
            onChange={(e) => toggle("pathways", value, e.target.checked)}
          />
        ))}
        {errors.pathways ? <FieldError id="pathways-error">{errors.pathways}</FieldError> : null}
      </fieldset>

      <Field htmlFor="visaStatus" label="Work authorization" error={errors.visaStatus}>
        <Select
          id="visaStatus"
          value={values.visaStatus ?? ""}
          onChange={(e) => set("visaStatus", e.target.value || null)}
          aria-invalid={Boolean(errors.visaStatus)}
          aria-describedby={describedBy("visaStatus")}
        >
          <option value="">Choose…</option>
          {Object.entries(VISA_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-gap-md md:grid-cols-2">
        <Field htmlFor="currentLocation" label="Where you live now" hint="City and country">
          <Input
            id="currentLocation"
            value={values.currentLocation ?? ""}
            onChange={(e) => set("currentLocation", e.target.value)}
            aria-describedby="currentLocation-hint"
            maxLength={120}
            autoComplete="address-level2"
          />
        </Field>
        <Field
          htmlFor="phone"
          label="Phone (optional)"
          hint="With country code, e.g. +91 98765 43210"
          error={errors.phone}
        >
          <Input
            id="phone"
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("phone", true)}
            maxLength={20}
            autoComplete="tel"
          />
        </Field>
      </div>
      <Checkbox
        label="This number is on WhatsApp"
        checked={values.phoneIsWhatsapp}
        onChange={(e) => set("phoneIsWhatsapp", e.target.checked)}
      />

      {Object.keys(errors).length ? (
        <Notice tone="error">Some answers need a look; see the messages above.</Notice>
      ) : null}
      {formError ? <Notice tone="error">{formError}</Notice> : null}
      {saved ? <Notice tone="success">Saved.</Notice> : null}
      <Button type="submit" variant="heroPrimary" className="self-start" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="font-mono text-mono text-error">
      <span aria-hidden="true">! </span>
      {children}
    </p>
  )
}
