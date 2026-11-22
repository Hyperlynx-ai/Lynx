import type { Metadata } from "next"

import { AccountSettings } from "@/components/account-settings"
import { getSessionUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Settings" }

export default async function CandidateSettings() {
  const user = await getSessionUser()
  return <AccountSettings email={user?.email ?? ""} />
}
