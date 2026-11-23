import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"
import { Panel } from "@lynx/ui/components/panel"

import { EditProfile } from "@/components/candidate/onboarding-forms"
import { getCandidate } from "@/lib/candidate/api"

export const metadata: Metadata = { title: "Your profile" }

export default async function ProfilePage() {
  const data = await getCandidate()
  if (data && !data.candidate) redirect("/app/onboarding")
  const candidate = data?.candidate

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Eyebrow>Your profile</Eyebrow>
        <Headline
          as="h1"
          size="headline"
          lead="Your profile."
          muted="What you're looking for. Lynx uses it to rank opportunities for you."
        />
      </div>
      {!candidate ? (
        <Notice tone="error" title="Couldn't load your profile">
          The server didn&apos;t answer. Refresh the page in a moment.
        </Notice>
      ) : (
        <Panel aria-labelledby="answers-heading" className="flex flex-col gap-gap-md">
          <h2 id="answers-heading" className="text-label text-text-primary">
            Your answers
          </h2>
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
      )}
    </div>
  )
}
