import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@lynx/ui/lib/utils"

/**
 * Buttons from the void-terminal-glass skill (references/components.md).
 * Pick the variant by role, not by looks:
 * - heroPrimary: the single most emphasized control on a screen (white pill).
 * - heroSecondary: the outline pill beside it. Never the primary.
 * - navbarCta: the sign-up pill in the navbar.
 * - navUtility: navbar dropdown triggers only.
 * - terminal: the mint, monospace "shell command" CTA. Rationed.
 * - mintFill / outlineSquare: square buttons for the pale-mint band and ruled layouts.
 * - link: plain text link style (e.g. "Log in").
 * - ghostIcon: a square icon-only button (save, close, more); needs an aria-label.
 */
const buttonVariants = cva(
  // Colours ease over 300ms; the press (scale 0.97) is quick so the button
  // feels like it heard the click (skill v2: Motion).
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-sans text-label whitespace-nowrap [transition:background-color_300ms_var(--ease-standard),border-color_300ms_var(--ease-standard),color_300ms_var(--ease-standard),transform_150ms_var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        heroPrimary: "h-11 rounded-pill bg-white px-6 text-black",
        heroSecondary:
          "h-11 rounded-pill border border-border bg-transparent px-6 text-text-primary",
        navbarCta: "h-9 rounded-pill bg-white px-4 text-black",
        navUtility: "h-[23px] rounded-control bg-transparent px-3.5 text-text-primary",
        terminal:
          "h-11 rounded-pill bg-accent px-7 font-mono text-mono text-black hover:bg-accent-hover",
        mintFill: "h-11 rounded-none bg-surface-alt px-4 text-ink-on-mint hover:bg-mint-fill-hover",
        outlineSquare:
          "h-11 rounded-none border border-border-subtle bg-white px-4 py-3 text-border-subtle",
        link: "h-auto bg-transparent p-0 text-text-primary hover:text-text-secondary",
        ghostIcon:
          "size-9 rounded-none bg-transparent text-text-secondary hover:bg-neutral-tint hover:text-text-primary",
      },
    },
    defaultVariants: {
      variant: "heroPrimary",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next.js Link) with button styles. */
    asChild?: boolean
  }

function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonProps }
