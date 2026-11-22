import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

/** Small dotted-grid glyph that opens a section (skill: "Below the fold"). */
function DotGridGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className={cn("size-2.5 text-accent", className)}
      fill="currentColor"
    >
      {[1, 5, 9].flatMap((y) =>
        [1, 5, 9].map((x) => <rect key={`${x}-${y}`} x={x - 1} y={y - 1} width="2" height="2" />)
      )}
    </svg>
  )
}

/** Left-aligned eyebrow label above a headline, in the label style. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-gap-sm text-label text-text-secondary", className)}>
      <DotGridGlyph />
      {children}
    </p>
  )
}

export { DotGridGlyph, Eyebrow }
