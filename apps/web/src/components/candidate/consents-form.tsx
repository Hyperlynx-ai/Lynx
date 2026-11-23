"use client"

import { useState, type FormEvent } from "react"

import type { CandidateConsentsInput } from "@lynx/shared/candidate"
import { Button } from "@lynx/ui/components/button"
import { Checkbox } from "@lynx/ui/components/checkbox"
import { Notice } from "@lynx/ui/components/notice"

import { saveConsents } from "@/lib/candidate/actions"

/**
 * Who sees the profile and which emails the candidate gets. Every choice is
 * off until the candidate turns it on, and each change is logged (PRIV-03).
 */
export function ConsentsForm({
  initial,
  completeOnboarding = false,
  submitLabel,
  onSaved,
}: {
  initial: CandidateConsentsInput
  completeOnboarding?: boolean
  submitLabel: string
  onSaved?: () => void
}) {
  const [values, setValues] = useState(initial)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const set = (key: keyof CandidateConsentsInput, on: boolean) =>
    setValues((v) => ({ ...v, [key]: on }))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    const result = await saveConsents({ ...values, completeOnboarding })
    setPending(false)
    if (!result.ok) {
      return setMessage({ tone: "error", text: "We couldn't save your choices. Please try again." })
    }
    if (!completeOnboarding) setMessage({ tone: "success", text: "Saved." })
    onSaved?.()
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-gap-md">
      <fieldset className="flex flex-col gap-gap-md">
        <legend className="sr-only">Who can see your profile</legend>
        <Checkbox
          label="Let approved recruiters find my profile"
          description="Recruiters are checked by Hyperlynx before they get access. They see your profile, your CV and your interview results."
          checked={values.visibleToRecruiters}
          onChange={(e) => set("visibleToRecruiters", e.target.checked)}
        />
        <Checkbox
          className="pl-7"
          label="Also show them my email and phone"
          description="So they can contact you directly. Without this, they contact you through Hyperlynx."
          checked={values.visibleToRecruiters && values.showContactToRecruiters}
          disabled={!values.visibleToRecruiters}
          onChange={(e) => set("showContactToRecruiters", e.target.checked)}
        />
      </fieldset>
      <fieldset className="flex flex-col gap-gap-md border-t border-border pt-gap-md">
        <legend className="sr-only">Emails</legend>
        <Checkbox
          label="Email me matching jobs every 2 days"
          description="Only roles that fit your profile, ranked by Lynx."
          checked={values.jobAlerts}
          onChange={(e) => set("jobAlerts", e.target.checked)}
        />
        <Checkbox
          label="Send me the weekly newsletter"
          description="Opportunities, visa news and tips for your target countries, once a week."
          checked={values.newsletter}
          onChange={(e) => set("newsletter", e.target.checked)}
        />
      </fieldset>
      <p className="text-body text-text-secondary">
        {completeOnboarding ? "You can change these at any time in Settings. " : ""}Every email has
        an unsubscribe link.
      </p>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button type="submit" variant="heroPrimary" className="self-start" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
