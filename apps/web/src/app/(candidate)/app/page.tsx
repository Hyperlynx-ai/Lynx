import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { COUNTRIES } from "@lynx/shared/candidate"
import { Eyebrow } from "@lynx/ui/components/eyebrow"
import { Headline } from "@lynx/ui/components/headline"

import { getSessionUser } from "@/lib/auth/session"
import { getCandidate, isOnboarded } from "@/lib/candidate/api"
import { listCvs } from "@/lib/cv/api"

export const metadata: Metadata = { title: "Home" }

export default async function CandidateHome() {
  const user = await getSessionUser()
  if (user && !(await isOnboarded(user.id))) redirect("/app/onboarding")
  const [data, cvs] = await Promise.all([getCandidate(), listCvs()])
  const candidate = data?.candidate
  const firstName = user?.fullName?.split(" ")[0]
  const cv = cvs?.[0]
  const countries = (candidate?.countries ?? [])
    .map((code) => COUNTRIES[code as keyof typeof COUNTRIES] ?? code)
    .join(", ")

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Eyebrow>Your Hyperlynx home</Eyebrow>
        <Headline
          as="h1"
          size="title"
          lead={firstName ? `Welcome, ${firstName}.` : "Welcome."}
          muted="Lynx is getting to know you. Here's where things stand."
        />
      </div>
      <ul className="grid border-t border-l border-border md:grid-cols-3">
        <Tile
          title="Your CV"
          status={
            cv?.status === "parsed"
              ? `Read by Lynx · ${cv.fileName}`
              : cv
                ? `Not read yet · ${cv.fileName}`
                : "Not uploaded yet"
          }
          href="/app/cv"
          action={cv ? "Open your CV" : "Upload your CV"}
        />
        <Tile
          title="What you're looking for"
          status={
            candidate
              ? `${candidate.targetRoles.join(", ")}${countries ? ` · ${countries}` : ""}`
              : "Not set yet"
          }
          href="/app/profile"
          action="See your profile"
        />
        <Tile
          title="Opportunities"
          status="Jobs ranked for you by Lynx arrive in the next release."
        />
      </ul>
    </div>
  )
}

function Tile(props: { title: string; status: string; href?: string; action?: string }) {
  return (
    <li className="flex flex-col gap-gap-sm border-r border-b border-border p-6">
      <h2 className="text-label text-text-primary">{props.title}</h2>
      <p className="flex-1 text-body text-text-secondary">{props.status}</p>
      {props.href && props.action ? (
        <Link
          href={props.href}
          className="self-start border-b border-border py-1 text-label text-text-primary transition-colors duration-200 ease-standard hover:border-accent"
        >
          {props.action}
        </Link>
      ) : null}
    </li>
  )
}
