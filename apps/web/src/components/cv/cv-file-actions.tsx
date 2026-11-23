"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@lynx/ui/components/button"
import { Notice } from "@lynx/ui/components/notice"
import { LoadingState } from "@lynx/ui/components/states"

import { deleteCv, retryCv } from "@/app/(candidate)/app/cv/actions"

import { cvErrorMessage } from "./messages"

type CvFileActionsProps = {
  cvId: string
  fileName: string
  /** Offer "Try again" (for CVs Lynx couldn't read yet). */
  canRetry?: boolean
}

/** Retry reading a CV, or delete it after a confirmation step. */
export function CvFileActions({ cvId, fileName, canRetry = false }: CvFileActionsProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState<"retry" | "delete" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function run(kind: "retry" | "delete") {
    setBusy(kind)
    setError(null)
    const result = kind === "retry" ? await retryCv(cvId) : await deleteCv(cvId)
    setBusy(null)
    setConfirming(false)
    if (!result.ok) setError(cvErrorMessage(result.error))
    startTransition(() => router.refresh())
  }

  if (busy) {
    return <LoadingState label={busy === "retry" ? "lynx is reading your cv" : "deleting"} />
  }

  return (
    <div className="flex flex-col gap-gap-sm">
      {confirming ? (
        <div className="flex flex-col gap-gap-sm border border-border p-4">
          <p className="text-body text-text-secondary">
            Delete <span className="text-text-primary">{fileName}</span> and everything Lynx read
            from it? This can&apos;t be undone.
          </p>
          <div className="flex flex-wrap gap-gap-md">
            <Button type="button" variant="outlineSquare" onClick={() => void run("delete")}>
              Delete CV
            </Button>
            <Button type="button" variant="link" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-gap-md">
          {canRetry ? (
            <Button type="button" variant="heroSecondary" onClick={() => void run("retry")}>
              Try again
            </Button>
          ) : null}
          <Button type="button" variant="link" onClick={() => setConfirming(true)}>
            Delete this CV
          </Button>
        </div>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  )
}
