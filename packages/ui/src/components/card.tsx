import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type CardProps = React.ComponentProps<"article"> & {
  /**
   * The card opens something or holds a primary link: it answers the pointer
   * (border brightens, lifts 2px on devices that hover). Static cards stay still.
   */
  interactive?: boolean
}

/**
 * A raised, square card for one item in a collection: a job, a candidate, an
 * application (skill v2: Cards). Surface fill, hairline border, 0 radius.
 * Forms and settings groups use Panel instead; never put a card in a card.
 */
function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <article
      data-slot="card"
      className={cn(
        "flex flex-col rounded-none border border-border bg-surface p-5 md:p-6",
        interactive &&
          "transition-[border-color,transform] duration-200 ease-out focus-within:border-border-strong hover:-translate-y-0.5 hover:border-border-strong motion-reduce:hover:translate-y-0",
        className
      )}
      {...props}
    />
  )
}

export { Card, type CardProps }
