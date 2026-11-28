import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

type HeadlineProps = {
  /** The headline: one colour (white), no trailing full stop. */
  title: React.ReactNode
  /** One or two sentences under it, in the 20px lede size (grey). */
  lede?: React.ReactNode
  /**
   * `display` = hero (68px) and `headline` = section (48px), for public pages;
   * `title` = page title on app, form and error screens (32px).
   */
  size?: "display" | "headline" | "title"
  as?: "h1" | "h2" | "h3"
  className?: string
}

/**
 * Headline + lede from the void-terminal-glass skill: a white headline and,
 * under it, a smaller grey paragraph. Hierarchy comes from size and space,
 * never from colour alone (skill v2; the old same-size two-tone headline is
 * retired).
 */
function Headline({ title, lede, size = "headline", as = "h2", className }: HeadlineProps) {
  const Tag = as
  return (
    <div className={cn("flex flex-col", size === "title" ? "gap-2" : "gap-4", className)}>
      <Tag
        className={cn(
          "font-sans font-normal text-text-primary",
          size === "display" ? "text-display" : size === "title" ? "text-title" : "text-headline"
        )}
      >
        {title}
      </Tag>
      {lede ? <p className="max-w-[62ch] text-lede text-text-secondary">{lede}</p> : null}
    </div>
  )
}

export { Headline, type HeadlineProps }
