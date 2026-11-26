"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"

import { setOpportunityState } from "@/app/(candidate)/app/opportunities/actions"

/** Save / Unsave and Hide for one opportunity card. */
export function SaveControls(props: { jobId: string; title: string; saved: boolean }) {
  const router = useRouter()
  const [saved, setSaved] = useState(props.saved)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  const act = (state: "saved" | "hidden" | null) =>
    startTransition(async () => {
      setError(false)
      const result = await setOpportunityState(props.jobId, state)
      if (!result.ok) {
        setError(true)
        return
      }
      if (state !== "hidden") setSaved(state === "saved")
      router.refresh()
    })

  return (
    <div className="flex items-center gap-gap-md">
      <Button
        type="button"
        variant="link"
        disabled={pending}
        aria-pressed={saved}
        aria-label={`${saved ? "Unsave" : "Save"} ${props.title}`}
        onClick={() => act(saved ? null : "saved")}
      >
        {saved ? "Saved" : "Save"}
      </Button>
      <Button
        type="button"
        variant="link"
        disabled={pending}
        aria-label={`Hide ${props.title}`}
        onClick={() => act("hidden")}
        className="text-text-secondary hover:text-text-primary"
      >
        Hide
      </Button>
      {error ? <span className="font-mono text-mono text-error">! Didn&apos;t work</span> : null}
    </div>
  )
}
