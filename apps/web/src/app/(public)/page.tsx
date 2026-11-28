import Link from "next/link"

import { Button } from "@lynx/ui/components/button"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"

import { CapabilityStrip } from "@/components/capability-strip"

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-content px-6 pt-gap-lg md:px-10">
        <Eyebrow>Hyperlynx · Global careers, powered by Lynx</Eyebrow>
        <Headline
          as="h1"
          size="display"
          className="mt-gap-md max-w-6xl"
          title="Jobs, internships and scholarships abroad, ranked for you"
          lede="Lynx, our AI career agent, finds roles that fit you, sharpens your CV and interviews you on camera, so recruiters can hire with confidence."
        />
        <div className="mt-10 flex flex-wrap items-center gap-gap-sm">
          <Button variant="heroPrimary" asChild>
            <Link href="/signup">Find opportunities</Link>
          </Button>
          <Button variant="heroSecondary" asChild>
            <Link href="/recruiters">Hire on Hyperlynx</Link>
          </Button>
        </div>
        <p className="mt-gap-sm text-small text-text-secondary">
          Free for candidates. Every recruiter is verified.
        </p>
      </section>
      <CapabilityStrip />
    </>
  )
}
