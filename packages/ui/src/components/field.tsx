import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type FieldProps = {
  /** Must match the id of the control inside. */
  htmlFor: string
  label: React.ReactNode
  /** Short help text under the control. */
  hint?: React.ReactNode
  /** Validation message. When set, the control should also get aria-invalid. */
  error?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Label + control + hint/error, stacked. Messages are linked to the control
 * through `${htmlFor}-hint` / `${htmlFor}-error` ids (use them in
 * aria-describedby).
 */
function Field({ htmlFor, label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-label text-text-primary">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="font-mono text-mono text-text-primary">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-body text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export { Field, type FieldProps }
