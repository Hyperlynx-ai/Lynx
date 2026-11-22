import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

/**
 * A ruled, square container (skill: cards are transparent, 0 radius, hairline
 * borders only). Use for forms, settings groups and data blocks.
 */
function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn("rounded-none border border-border bg-transparent p-6 md:p-8", className)}
      {...props}
    />
  )
}

export { Panel }
