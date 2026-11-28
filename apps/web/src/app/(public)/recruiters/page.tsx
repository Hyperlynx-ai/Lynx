import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@lynx/ui/components/button"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { FeatureGrid } from "@lynx/ui/components/feature-grid"
import { Headline } from "@lynx/ui/components/headline"

export const metadata: Metadata = { title: "Hire on Hyperlynx" }

const features = [
  {
    label: "Verified candidates",
    description: "Lynx interviews candidates on video and scores them with evidence you can check.",
  },
  {
    label: "Ranked for each role",
    description:
      "Describe who you need in plain words; Lynx ranks candidates and says why they fit.",
  },
  {
    label: "Interview scorecards",
    description:
      "Strengths, gaps and the transcript, plus the recording when the candidate allows it.",
  },
  {
    label: "Post jobs for free",
    description:
      "Your roles reach candidates in India and abroad, marked as affiliated with Hyperlynx.",
  },
  {
    label: "Required interviews",
    description: "Ask applicants to complete a Lynx interview for a role before they apply.",
  },
  {
    label: "A simple pipeline",
    description: "Move applicants from new to shortlisted to hired, all in one place.",
  },
]

export default function RecruitersPage() {
  return (
    <>
      <section className="mx-auto max-w-content px-6 pt-gap-lg md:px-10">
        <Eyebrow>For recruiters</Eyebrow>
        <Headline
          as="h1"
          size="display"
          className="mt-gap-md max-w-6xl"
          title="Hire people who have already been interviewed"
          lede="Start from evidence, not just a CV: Hyperlynx candidates practise and verify their skills with Lynx, our AI interviewer."
        />
        <div className="mt-10 flex flex-wrap items-center gap-gap-sm">
          <Button variant="heroPrimary" asChild>
            <Link href="/recruiters/signup">Create a recruiter account</Link>
          </Button>
          <Button variant="heroSecondary" asChild>
            <Link href="/recruiters/login">Recruiter login</Link>
          </Button>
        </div>
        <p className="mt-gap-sm text-small text-text-secondary">
          Work email required. Our team reviews every account.
        </p>
      </section>
      <section className="mx-auto max-w-content px-6 py-gap-lg md:px-10">
        <Headline
          size="headline"
          className="mb-gap-lg max-w-4xl"
          title="Everything you need to hire well"
          lede="Some of it is still being built; your account will be ready when it ships."
        />
        <FeatureGrid features={features} />
      </section>
    </>
  )
}
