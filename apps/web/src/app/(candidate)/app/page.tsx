import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@lynx/ui/components/button"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"
import { EmptyState } from "@lynx/ui/components/states"

import { getSessionUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Home" }

export default async function CandidateHome() {
  const user = await getSessionUser()
  const firstName = user?.fullName?.split(" ")[0]

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Eyebrow>Your Hyperlynx home</Eyebrow>
        <Headline
          as="h1"
          size="headline"
          lead={firstName ? `Welcome, ${firstName}.` : "Welcome."}
          muted="This is where Lynx will show your profile, your CV and the opportunities that fit you."
        />
      </div>
      <EmptyState
        title="Start with your CV."
        description="Upload it and Lynx reads it in about 20 seconds; your profile and matching opportunities build on it."
        action={
          <Button asChild variant="heroPrimary">
            <Link href="/app/cv">Upload your CV</Link>
          </Button>
        }
      />
    </div>
  )
}
