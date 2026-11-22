import * as React from "react"

import { cn } from "@lynx/ui/lib/utils"

import { DotGridGlyph } from "./eyebrow"

export type Feature = { label: string; description: string }

/**
 * Feature grid (skill: "Feature grid (3x2)"): a strict uniform grid of equal
 * cells separated by hairlines, each with a small mint glyph, a bold label and
 * gray text. Informational only: no buttons inside cells.
 */
function FeatureGrid({ features, className }: { features: Feature[]; className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 border-t border-l border-border sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {features.map((feature) => (
        <li
          key={feature.label}
          className="flex flex-col gap-gap-sm border-r border-b border-border p-6 md:p-8"
        >
          <DotGridGlyph />
          <p className="text-label text-text-primary">{feature.label}</p>
          <p className="text-body text-text-secondary">{feature.description}</p>
        </li>
      ))}
    </ul>
  )
}

export { FeatureGrid }
