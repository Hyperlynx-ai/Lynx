import { Button } from "@lynx/ui/components/button"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"

import { CapabilityStrip } from "@/components/capability-strip"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-content px-6 pt-gap-lg md:px-10">
          <Eyebrow>Hyperlynx · Global careers, powered by Lynx</Eyebrow>
          <Headline
            as="h1"
            size="display"
            className="mt-gap-md max-w-5xl"
            lead="Where ambitious people meet global opportunities."
            muted="Lynx, our AI agent, ranks the roles that fit you, sharpens your CV and interviews you on camera, so recruiters can hire with confidence."
          />
          <div className="mt-10 flex flex-wrap items-center gap-gap-sm">
            <Button variant="heroPrimary" disabled>
              Find opportunities
            </Button>
            <Button variant="heroSecondary" disabled>
              Hire on Hyperlynx
            </Button>
          </div>
          <p className="mt-gap-sm font-mono text-mono text-text-secondary">
            $ accounts open in the next release
          </p>
        </section>
        <CapabilityStrip />
      </main>
      <SiteFooter />
    </>
  )
}
