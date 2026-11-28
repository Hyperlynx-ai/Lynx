"use client"

import { useRouter } from "next/navigation"
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react"

import { MAX_CV_BYTES, type CvMediaType } from "@lynx/shared/cv"
import { Button } from "@lynx/ui/components/button"
import { Notice } from "@lynx/ui/components/notice"
import { LoadingState } from "@lynx/ui/components/states"
import { cn } from "@lynx/ui/lib/utils"

import { registerCv } from "@/app/(candidate)/app/cv/actions"
import { createClient } from "@/lib/supabase/client"

import { cvErrorMessage, isSavedFileError } from "./messages"

const TYPES: Record<string, CvMediaType> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

type Phase = "idle" | "uploading" | "reading"

/** The file's type from its extension (browsers often leave DOCX types empty). */
function typeOf(file: File): { extension: string; mediaType: CvMediaType } | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  const mediaType = TYPES[extension]
  return mediaType ? { extension, mediaType } : null
}

/**
 * Upload a CV: the file goes straight from the browser to the private `cvs`
 * bucket (cvs/<user id>/<random name>), then the API registers it and Lynx
 * reads it (about 20 seconds).
 */
export function CvUpload({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const router = useRouter()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const busy = phase !== "idle"

  async function upload(file: File) {
    setError(null)
    const type = typeOf(file)
    if (!type) return setError(cvErrorMessage("wrong_type"))
    if (file.size > MAX_CV_BYTES) return setError(cvErrorMessage("too_large"))
    if (file.size === 0) return setError(cvErrorMessage("invalid_file"))

    setPhase("uploading")
    const path = `${userId}/${crypto.randomUUID().replaceAll("-", "")}.${type.extension}`
    const { error: uploadError } = await createClient()
      .storage.from("cvs")
      .upload(path, file, { contentType: type.mediaType, upsert: false })
    if (uploadError) {
      setPhase("idle")
      return setError(cvErrorMessage("upload_failed"))
    }

    setPhase("reading")
    const result = await registerCv({
      path,
      fileName: file.name.slice(0, 255),
      mediaType: type.mediaType,
      sizeBytes: file.size,
    })
    setPhase("idle")
    if (!result.ok && !isSavedFileError(result.error)) setError(cvErrorMessage(result.error))
    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void upload(file)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !busy) void upload(file)
  }

  return (
    <div className="flex flex-col gap-gap-sm">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-start gap-gap-md border border-dashed border-border transition-colors duration-200 ease-standard",
          compact ? "p-6" : "p-8 md:p-10",
          dragging && "border-accent"
        )}
      >
        {busy ? (
          <div className="flex flex-col gap-2">
            <LoadingState
              label={phase === "uploading" ? "uploading your cv" : "lynx is reading your cv"}
            />
            {phase === "reading" ? (
              <p className="text-body text-text-secondary">
                This takes about 20 seconds. Keep this page open.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-label">
              <span className="text-text-primary">
                {compact ? "Upload a new CV." : "Drop your CV here."}
              </span>
              <span className="text-text-secondary">
                {" "}
                Lynx reads it and fills in your profile. You can check and correct everything.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-gap-md">
              <Button
                type="button"
                variant={compact ? "heroSecondary" : "heroPrimary"}
                onClick={() => inputRef.current?.click()}
              >
                Choose a file
              </Button>
              <span className="text-small text-text-secondary">PDF or DOCX, up to 10 MB</span>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label="CV file"
          onChange={onChange}
          disabled={busy}
        />
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  )
}
