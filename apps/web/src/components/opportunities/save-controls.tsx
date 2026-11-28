"use client"

import { Bookmark, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"
import { cn } from "@lynx/ui/lib/utils"

import { setOpportunityState } from "@/app/(candidate)/app/opportunities/actions"

/** Save (a toggle) and Hide, as icon buttons in the top corner of a job card. */
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
    <div className="flex shrink-0 items-center">
      {error ? (
        <span role="alert" className="mr-2 text-small text-error">
          Didn&apos;t work
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghostIcon"
        disabled={pending}
        aria-pressed={saved}
        aria-label={`${saved ? "Unsave" : "Save"} ${props.title}`}
        title={saved ? "Saved" : "Save"}
        onClick={() => act(saved ? null : "saved")}
        className={cn(saved && "text-accent hover:text-accent")}
      >
        <Bookmark aria-hidden="true" className={cn("size-[18px]", saved && "fill-current")} />
      </Button>
      <Button
        type="button"
        variant="ghostIcon"
        disabled={pending}
        aria-label={`Hide ${props.title}`}
        title="Hide"
        onClick={() => act("hidden")}
      >
        <EyeOff aria-hidden="true" className="size-[18px]" />
      </Button>
    </div>
  )
}
