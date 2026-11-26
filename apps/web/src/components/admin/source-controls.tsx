"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"
import { cn } from "@lynx/ui/lib/utils"

import { requestSourceRun, setSourceEnabled } from "@/app/admin/sources/actions"

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
      <button
        type="button"
        role="switch"
        aria-checked={props.enabled}
        aria-label={`${props.name} ${props.enabled ? "on" : "off"}`}
        disabled={pending}
        onClick={() => act(() => setSourceEnabled(props.id, !props.enabled))}
        className={cn(
          "flex h-6 w-11 cursor-pointer items-center rounded-pill border px-0.5 transition-colors duration-200 ease-standard disabled:opacity-50",
          props.enabled ? "justify-end border-accent" : "justify-start border-border"
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-4 rounded-pill", props.enabled ? "bg-accent" : "bg-text-secondary")}
        />
      </button>
      <Button
        type="button"
        variant="link"
        disabled={pending || !props.enabled || props.runRequested}
        onClick={() => act(() => requestSourceRun(props.id))}
      >
        {props.runRequested ? "Run requested" : "Run now"}
      </Button>
      {error ? <span className="font-mono text-mono text-error">! {error}</span> : null}
    </div>
  )
}
