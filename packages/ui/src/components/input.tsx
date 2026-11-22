import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

/**
 * Text input (skill: "When the system is silent" → form inputs): square,
 * transparent, 1px hairline border, 44px tall, white text, gray placeholder,
 * mint border on focus. Invalid inputs get a white border (red is reserved for
 * charts in this design language).
 */
function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-none border border-border bg-transparent px-3 font-sans text-body text-text-primary transition-[border-color] duration-200 ease-standard outline-none placeholder:text-text-secondary",
        "focus-visible:border-accent focus-visible:outline-none",
        "aria-invalid:border-text-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
