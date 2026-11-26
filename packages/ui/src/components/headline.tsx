import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type HeadlineProps = {
  /** The white lead clause. */
  lead: React.ReactNode
  /** The gray continuation clause, inline on the same line flow. Never a separate subhead. */
  muted?: React.ReactNode
  /**
   * `display` = hero (68px) and `headline` = section (48px), for public pages;
   * `title` = page title on signed-in app screens (32px).
   */
  size?: "display" | "headline" | "title"
  as?: "h1" | "h2" | "h3"
  className?: string
}

/**
 * The fused headline from the void-terminal-glass skill: one text block, a
 * white lead clause followed by a muted clause. Hierarchy comes from colour,
 * never from heavier weight (display weight stays 400).
 */
function Headline({ lead, muted, size = "headline", as = "h2", className }: HeadlineProps) {
  const Tag = as
  return (
    <Tag
      className={cn(
        "font-sans font-normal",
        size === "display" ? "text-display" : size === "title" ? "text-title" : "text-headline",
        className
      )}
    >
      <span className="text-text-primary">{lead}</span>
      {muted ? <span className="text-text-secondary"> {muted}</span> : null}
    </Tag>
  )
}

export { Headline, type HeadlineProps }
