import type { Metadata } from "next"
import Link from "next/link"

import { AI_TEST_DATA_ONLY } from "@lynx/shared/policy"
import { Button } from "@lynx/ui/components/button"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"

import { OnboardingConsents, OnboardingProfile } from "@/components/candidate/onboarding-forms"
import { OnboardingSteps } from "@/components/candidate/onboarding-steps"
import { CvUpload } from "@/components/cv/cv-upload"
import { DemoNotice } from "@/components/cv/demo-notice"
import { requireRole } from "@/lib/auth/require-role"
import { getCandidate } from "@/lib/candidate/api"
import { getCv, listCvs } from "@/lib/cv/api"

export const metadata: Metadata = { title: "Set up your profile" }

const HEADLINES = {
  1: { title: "Start with your CV", lede: "Lynx reads it and fills in most of your profile." },
  2: {
    title: "Tell Lynx what you're looking for",
    lede: "We filled in what we could from your CV. Check it and add the rest.",
  },
  3: {
    title: "Choose who sees your profile",
    lede: "Everything here is off until you turn it on, and you can change it any time.",
  },
} as const

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const user = await requireRole("candidate", "/app/onboarding")
  const requested = Number((await searchParams).step ?? "1")
  const data = await getCandidate()
  const candidate = data?.candidate ?? null
  // Step 3 needs saved answers; otherwise show step 2.
  const step = (
    requested === 3 && !candidate ? 2 : [1, 2, 3].includes(requested) ? requested : 1
  ) as 1 | 2 | 3
  const headline = HEADLINES[step]

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Headline as="h1" size="title" title={headline.title} lede={headline.lede} />
        <OnboardingSteps current={step} />
      </div>

      {!data ? (
        <Notice tone="error" title="Couldn't load your profile">
          The server didn&apos;t answer. Refresh the page in a moment.
        </Notice>
      ) : step === 1 ? (
        <CvStep userId={user.id} />
      ) : step === 2 ? (
        <OnboardingProfile
          initial={{
            targetRoles: candidate?.targetRoles ?? data.suggestions.targetRoles,
            countries: candidate?.countries ?? [],
            experienceLevel: candidate?.experienceLevel ?? null,
            educationLevel: candidate?.educationLevel ?? data.suggestions.educationLevel,
            pathways: candidate?.pathways ?? [],
            visaStatus: candidate?.visaStatus ?? null,
            currentLocation: candidate?.currentLocation ?? data.suggestions.currentLocation,
            phone: candidate?.phone ?? data.suggestions.phone,
            phoneIsWhatsapp: candidate?.phoneIsWhatsapp ?? false,
          }}
        />
      ) : (
        <OnboardingConsents
          initial={{
            visibleToRecruiters: candidate?.visibleToRecruiters ?? false,
            showContactToRecruiters: candidate?.showContactToRecruiters ?? false,
            jobAlerts: candidate?.jobAlerts ?? false,
            newsletter: candidate?.newsletter ?? false,
          }}
        />
      )}
    </div>
  )
}

async function CvStep({ userId }: { userId: string }) {
  const cvs = await listCvs()
  const latest = cvs?.[0]
  const parsed = latest?.status === "parsed" ? await getCv(latest.id) : null
  const name = parsed?.current?.data.basics.name

  return (
    <div className="flex max-w-3xl flex-col gap-gap-md">
      {AI_TEST_DATA_ONLY ? <DemoNotice /> : null}
      {parsed?.current ? (
        <>
          <Notice tone="success" title={`Lynx has read ${name ? `${name}'s` : "your"} CV.`}>
            {latest!.fileName}. You can check everything it read on the CV page later.
          </Notice>
          <div className="flex flex-wrap items-center gap-gap-md">
            <Button asChild variant="heroPrimary">
              <Link href="/app/onboarding?step=2">Continue</Link>
            </Button>
          </div>
          <CvUpload userId={userId} compact />
        </>
      ) : (
        <>
          <CvUpload userId={userId} />
          <Link
            href="/app/onboarding?step=2"
            className="self-start text-label text-text-secondary transition-colors duration-200 ease-standard hover:text-text-primary"
          >
            Skip for now, I&apos;ll add my CV later
          </Link>
        </>
      )}
    </div>
  )
}
