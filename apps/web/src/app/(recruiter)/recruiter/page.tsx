import type { Metadata } from "next"

import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"

import { getSessionUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Recruiter home" }

export default async function RecruiterHome() {
  const user = await getSessionUser()
  const firstName = user?.fullName?.split(" ")[0]

  return (
    <div className="flex max-w-4xl flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Headline
          as="h1"
          size="title"
          title={firstName ? `Welcome, ${firstName}` : "Welcome"}
          lede="Your company, your roles and Lynx-verified candidates will live here."
        />
      </div>
      <Notice tone="info" title="Your account is waiting for approval">
        The Hyperlynx team reviews every recruiter account. Company setup, job posting and candidate
        search open once your account is approved; these arrive in an upcoming release.
      </Notice>
    </div>
  )
}
