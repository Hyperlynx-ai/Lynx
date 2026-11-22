import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type NoticeProps = {
  /** `info` = neutral; `error` = something went wrong; `success` = done. */
  tone?: "info" | "error" | "success"
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const marker = { info: "i", error: "!", success: "✓" } as const

/**
 * A ruled message box for form results and page notices. Tone is shown by a
 * mono marker (and the mint status color only for success), never by red or
 * amber fills, which the design language reserves for charts.
 */
function Notice({ tone = "info", title, children, className }: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-gap-sm border border-border p-4",
        tone === "error" && "border-text-primary",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "font-mono text-mono",
          tone === "success" ? "text-accent" : "text-text-primary"
        )}
      >
        {marker[tone]}
      </span>
      <div className="flex flex-col gap-1">
        {title ? <p className="text-label text-text-primary">{title}</p> : null}
        {children ? <div className="text-body text-text-secondary">{children}</div> : null}
      </div>
    </div>
  )
}

export { Notice, type NoticeProps }
