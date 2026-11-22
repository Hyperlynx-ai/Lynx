import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type StatusDotProps = {
  /** `ok` shows the mint dot (the skill's "all systems operational" signal). */
  state: "ok" | "unknown" | "down"
  className?: string
}

/** A tiny, pill-rounded status dot. Mint only when healthy; gray otherwise. */
function StatusDot({ state, className }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 rounded-pill",
        state === "ok" ? "bg-accent" : "bg-text-secondary",
        state === "unknown" && "opacity-50",
        className
      )}
    />
  )
}

export { StatusDot, type StatusDotProps }
