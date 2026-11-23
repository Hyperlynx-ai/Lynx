import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

/** Multi-line text input, styled like Input (square, hairline, mint focus). */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full min-w-0 rounded-none border border-border bg-transparent px-3 py-2.5 font-sans text-body text-text-primary transition-[border-color] duration-200 ease-standard outline-none placeholder:text-text-secondary",
        "focus-visible:border-accent",
        "aria-invalid:border-error",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
