import Link from "next/link"

import { Button } from "@lynx/ui/components/button"
import { Headline } from "@lynx/ui/components/headline"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-content px-6 py-gap-lg md:px-10">
        <p className="font-mono text-mono text-text-secondary">$ 404 · page not found</p>
        <Headline
          as="h1"
          size="headline"
          className="mt-gap-md max-w-3xl"
          lead="This page doesn't exist."
          muted="It may have moved, or the link may be wrong."
        />
        <Button variant="heroPrimary" asChild className="mt-10">
          <Link href="/">Back to the home page</Link>
        </Button>
      </main>
      <SiteFooter />
    </>
  )
}
