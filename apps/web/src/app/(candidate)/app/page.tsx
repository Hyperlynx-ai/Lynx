import { Card } from "@lynx/ui/components/card"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { COUNTRIES } from "@lynx/shared/candidate"
import { Headline } from "@lynx/ui/components/headline"

import { getSessionUser } from "@/lib/auth/session"
import { getCandidate, isOnboarded } from "@/lib/candidate/api"
import { listCvs } from "@/lib/cv/api"
import { getOpportunities } from "@/lib/opportunities/api"

export const metadata: Metadata = { title: "Home" }

export default async function CandidateHome() {
  const user = await getSessionUser()
  if (user && !(await isOnboarded(user.id))) redirect("/app/onboarding")
  const [data, cvs, feed] = await Promise.all([getCandidate(), listCvs(), getOpportunities({})])
  const top = feed.data?.items.find((item) => item.match)
  const strong = feed.data?.items.filter((item) => item.match?.label === "strong").length ?? 0
  const candidate = data?.candidate
  const firstName = user?.fullName?.split(" ")[0]
  const cv = cvs?.[0]
  const countries = (candidate?.countries ?? [])
    .map((code) => COUNTRIES[code as keyof typeof COUNTRIES] ?? code)
    .join(", ")

  return (
    <div className="flex flex-col gap-gap-lg">
      <div className="flex flex-col gap-gap-md">
        <Headline
          as="h1"
          size="title"
          title={firstName ? `Welcome, ${firstName}` : "Welcome"}
          lede="Lynx is getting to know you. Here's where things stand."
        />
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
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
          status={
            top
              ? `${strong ? `${strong} strong matches on your first page. ` : ""}Top: ${top.title}${top.company ? ` at ${top.company}` : ""}.`
              : feed.data?.matching.status === "ready"
                ? "No ranked matches yet. Browse the newest jobs in your countries."
                : "Lynx is ranking jobs for you. Your matches arrive in a few minutes."
          }
          href="/app/opportunities"
          action="See your opportunities"
        />
      </ul>
    </div>
  )
}

function Tile(props: { title: string; status: string; href?: string; action?: string }) {
  return (
    <li className="flex">
      <Card className="w-full gap-gap-sm">
        <h2 className="text-heading text-text-primary">{props.title}</h2>
        <p className="flex-1 text-body text-text-secondary">{props.status}</p>
        {props.href && props.action ? (
          <Link
            href={props.href}
            className="self-start border-b border-border py-1 text-label text-text-primary transition-colors duration-200 ease-standard hover:border-accent"
          >
            {props.action}
          </Link>
        ) : null}
      </Card>
    </li>
  )
}
