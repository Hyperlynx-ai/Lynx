import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type BadgeProps = React.ComponentProps<"span"> & {
  /**
   * Signal colours only, as tints (skill v2: Status badges):
   * accent = good / done / strong, warning = needs attention, error = failed,
   * neutral = everything else (new, draft, closed, partial).
   */
  tone?: "accent" | "warning" | "error" | "neutral"
  /** A leading status dot in the tone's colour. */
  dot?: boolean
}

/** A small square status label: match labels, application stages, job states. */
function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-none px-2 text-small font-medium whitespace-nowrap",
        tone === "accent" && "bg-accent-tint text-accent",
        tone === "warning" && "bg-warning-tint text-warning",
        tone === "error" && "bg-error-tint text-error",
        tone === "neutral" && "bg-neutral-tint text-text-secondary",
        className
      )}
      {...props}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-pill bg-current" /> : null}
      {children}
    </span>
  )
}

export { Badge, type BadgeProps }
