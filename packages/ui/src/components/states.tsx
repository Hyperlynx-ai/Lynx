import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

import { DotGridGlyph } from "./eyebrow"

type EmptyStateProps = {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/** Shown when a list or page has nothing yet. */
function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-gap-sm border border-dashed border-border p-8",
        className
      )}
    >
      <DotGridGlyph />
      <p className="text-label">
        <span className="text-text-primary">{title}</span>
        {description ? <span className="text-text-secondary"> {description}</span> : null}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/** Inline loading indicator in the mono "terminal" style. */
function LoadingState({ label = "loading", className }: { label?: string; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("font-mono text-mono text-text-secondary", className)}
    >
      $ {label}
      <span className="inline-block animate-pulse" aria-hidden="true">
        _
      </span>
    </p>
  )
}

export { EmptyState, LoadingState, type EmptyStateProps }
