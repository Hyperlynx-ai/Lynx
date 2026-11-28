import { ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

/**
 * Native select styled like Input: square, hairline border, 44px, mint focus,
 * red border when aria-invalid. A mono "v" marks it as a dropdown.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        className={cn(
          "h-11 w-full min-w-0 cursor-pointer appearance-none rounded-none border border-border bg-background pr-9 pl-3 font-sans text-body text-text-primary transition-[border-color] duration-200 ease-standard outline-none",
          "focus-visible:border-accent",
          "aria-invalid:border-error",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
      />
    </div>
  )
}

export { Select }
