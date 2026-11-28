"use client"

import { Button } from "@lynx/ui/components/button"
import { Headline } from "@lynx/ui/components/headline"

/** Shown when a page crashes. No error details are displayed (they may contain data). */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-content px-6 py-gap-lg md:px-10">
      <Headline
        as="h1"
        size="title"
        className="max-w-3xl"
        title="Sorry, this page failed to load"
        lede="Try again. If it keeps happening, tell the Hyperlynx team."
      />
      <Button variant="heroPrimary" className="mt-10" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  )
}
