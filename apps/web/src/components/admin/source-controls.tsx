"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"

import { requestSourceRun, setSourceEnabled } from "@/app/admin/sources/actions"
import { Switch } from "@/components/admin/switch"

/** On/off switch and "Run now" for one job source. */
export function SourceControls(props: {
  id: string
  name: string
  enabled: boolean
  runRequested: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const act = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null)
      const result = await action()
      if (!result.ok) setError("Didn't work. Try again.")
      router.refresh()
    })

  return (
    <div className="flex flex-wrap items-center justify-end gap-gap-sm">
      <Switch
        checked={props.enabled}
        label={`${props.name} ${props.enabled ? "on" : "off"}`}
        disabled={pending}
        onClick={() => act(() => setSourceEnabled(props.id, !props.enabled))}
      />
      <Button
        type="button"
        variant="link"
        disabled={pending || !props.enabled || props.runRequested}
        onClick={() => act(() => requestSourceRun(props.id))}
      >
        {props.runRequested ? "Run requested" : "Run now"}
      </Button>
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
