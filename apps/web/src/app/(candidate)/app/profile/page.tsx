import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Button } from "@lynx/ui/components/button"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"
import { Panel } from "@lynx/ui/components/panel"

import { FactList, TellLynx } from "@/components/candidate/lynx-memory"
import { EditProfile } from "@/components/candidate/onboarding-forms"
import { getCandidate, getFacts } from "@/lib/candidate/api"

export const metadata: Metadata = { title: "Your profile" }

export default async function ProfilePage() {
  const [data, facts] = await Promise.all([getCandidate(), getFacts()])
  if (data && !data.candidate) redirect("/app/onboarding")
  const candidate = data?.candidate

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Headline
          as="h1"
          size="title"
          title="What Lynx knows about you"
          lede="Every fact and where it came from. Correct or delete anything; Lynx only uses what's here."
        />
      </div>

      <section aria-label="What Lynx knows about you" className="flex flex-col gap-gap-md">
        <TellLynx />
        {facts ? (
          <FactList facts={facts} />
        ) : (
          <Notice tone="error" title="Couldn't load what Lynx knows">
            The server didn&apos;t answer. Refresh the page in a moment.
          </Notice>
        )}
      </section>

      {candidate ? (
        <Panel aria-labelledby="answers-heading" className="flex flex-col gap-gap-md">
          <div>
            <h2 id="answers-heading" className="text-label text-text-primary">
              What you&apos;re looking for
            </h2>
            <p className="mt-1 text-body text-text-secondary">
              Your answers from onboarding. Lynx ranks opportunities with them.
            </p>
          </div>
          <EditProfile
            initial={{
              targetRoles: candidate.targetRoles,
              countries: candidate.countries,
              experienceLevel: candidate.experienceLevel,
              educationLevel: candidate.educationLevel,
              pathways: candidate.pathways,
              visaStatus: candidate.visaStatus,
              currentLocation: candidate.currentLocation,
              phone: candidate.phone,
              phoneIsWhatsapp: candidate.phoneIsWhatsapp,
            }}
          />
        </Panel>
      ) : (
        <Notice tone="error" title="Couldn't load your answers">
          The server didn&apos;t answer. Refresh the page in a moment.
        </Notice>
      )}

      <Panel className="flex flex-col gap-gap-md">
        <div>
          <h2 className="text-label text-text-primary">Download my data</h2>
          <p className="mt-1 text-body text-text-secondary">
            Everything Hyperlynx stores about you (profile, choices, CVs as Lynx read them, and
            these facts) in one JSON file.
          </p>
        </div>
        <Button asChild variant="heroSecondary" className="self-start">
          <a href="/app/profile/export" download>
            Download my data
          </a>
        </Button>
      </Panel>
    </div>
  )
}
