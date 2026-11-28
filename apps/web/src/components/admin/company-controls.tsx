"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"

import { removeCompany, setCompanyEnabled } from "@/app/admin/companies/actions"
import { Switch } from "@/components/admin/switch"

/** On/off switch and a two-step "Remove" for one company board. */
export function CompanyControls(props: { id: string; name: string; enabled: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const act = (action: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      setError(null)
      const result = await action()
      if (!result.ok) setError("Didn't work. Try again.")
      setConfirming(false)
      router.refresh()
    })

  return (
    <div className="flex flex-wrap items-center justify-end gap-gap-sm">
      <Switch
        checked={props.enabled}
        label={`${props.name} ${props.enabled ? "on" : "off"}`}
        disabled={pending}
        onClick={() => act(() => setCompanyEnabled(props.id, !props.enabled))}
      />
      {confirming ? (
        <>
          <Button
            type="button"
            variant="link"
            disabled={pending}
            onClick={() => act(() => removeCompany(props.id))}
            className="text-error"
          >
            Remove {props.name}
          </Button>
          <Button type="button" variant="link" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="link"
          disabled={pending}
          onClick={() => setConfirming(true)}
          aria-label={`Remove ${props.name}`}
        >
          Remove
        </Button>
      )}
      {error ? (
        <span role="alert" className="text-small text-error">
          <span aria-hidden="true" className="font-mono">
            !{" "}
          </span>
          {error}
        </span>
      ) : null}
    </div>
  )
}
