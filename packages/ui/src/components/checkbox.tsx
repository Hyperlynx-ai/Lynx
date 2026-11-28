import { Check } from "lucide-react"
import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: React.ReactNode
  /** Optional second line under the label. */
  description?: React.ReactNode
}

/**
 * A square checkbox with its label: a native input (keyboard and screen
 * readers work as usual) drawn as a 16px ruled box that fills with a mint
 * tick when checked. The whole row is clickable.
 */
function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generated = React.useId()
  const inputId = id ?? generated
  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group flex cursor-pointer items-start gap-gap-sm has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className="peer sr-only"
        aria-describedby={description ? `${inputId}-description` : undefined}
        {...props}
      />
      <span
        aria-hidden="true"
        className="mt-1 flex size-4 shrink-0 items-center justify-center border border-border text-transparent transition-colors duration-200 ease-standard peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-label text-text-primary">{label}</span>
        {description ? (
          <span id={`${inputId}-description`} className="text-body text-text-secondary">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export { Checkbox, type CheckboxProps }
