import type { Metadata } from "next"

import { Panel } from "@lynx/ui/components/panel"

import { AccountSettings } from "@/components/account-settings"
import { ConsentsForm } from "@/components/candidate/consents-form"
import { getSessionUser } from "@/lib/auth/session"
import { getCandidate } from "@/lib/candidate/api"

export const metadata: Metadata = { title: "Settings" }

export default async function CandidateSettings() {
  const [user, data] = await Promise.all([getSessionUser(), getCandidate()])
  const candidate = data?.candidate
  return (
    <AccountSettings email={user?.email ?? ""}>
      {candidate ? (
        <Panel className="flex flex-col gap-gap-md">
          <div>
            <h2 className="text-label text-text-primary">Privacy and emails</h2>
            <p className="mt-1 text-body text-text-secondary">
              Who can see your profile, and which emails you get.
            </p>
          </div>
          <ConsentsForm
            submitLabel="Save choices"
            initial={{
              visibleToRecruiters: candidate.visibleToRecruiters,
              showContactToRecruiters: candidate.showContactToRecruiters,
              jobAlerts: candidate.jobAlerts,
              newsletter: candidate.newsletter,
            }}
          />
        </Panel>
      ) : null}
    </AccountSettings>
  )
}
