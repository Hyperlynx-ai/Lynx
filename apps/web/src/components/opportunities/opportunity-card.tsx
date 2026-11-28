import { COUNTRIES } from "@lynx/shared/candidate"
import { JOB_TYPES, MATCH_LABELS } from "@lynx/shared/jobs"
import { ArrowUpRight } from "lucide-react"

import { Badge } from "@lynx/ui/components/badge"
import { Button } from "@lynx/ui/components/button"
import { Card } from "@lynx/ui/components/card"

import { SaveControls } from "@/components/opportunities/save-controls"
import type { Opportunity } from "@/lib/opportunities/api"

const DAY = 24 * 60 * 60 * 1000

/** "today", "3 days ago", "5 weeks ago" (UTC days; null when unknown). */
export function postedAgo(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null
  const days = Math.floor((now - new Date(iso).getTime()) / DAY)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

const deadlineFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

/** Where the job is, briefly: "Dubai, United Arab Emirates", "Remote". */
export function place(o: Pick<Opportunity, "city" | "country" | "remote" | "location">) {
  const country = o.country ? (COUNTRIES[o.country as keyof typeof COUNTRIES] ?? o.country) : null
  const where = [o.city, country].filter(Boolean).join(", ") || o.location || null
  if (o.remote) return where ? `Remote · ${where}` : "Remote"
  return where
}

/** Credit the source as its terms ask; company boards are the company's own site. */
export function sourceCredit(source: Opportunity["source"]) {
  if (source.kind === "ats") return "the company's careers page"
  if (source.kind === "curated") return "Hyperlynx"
  return source.name
}

const MATCH_TONE = { strong: "accent", good: "neutral", partial: "neutral" } as const

/**
 * One opportunity in the feed, as a card (skill v2: Cards, job card anatomy):
 * match and save on top, title, company and place, facts as chips, Lynx's
 * reason in a tinted box, then the source and Apply at the bottom.
 */
export function OpportunityCard({ item }: { item: Opportunity }) {
  const posted = postedAgo(item.postedAt)
  const chips = [
    item.employmentType ? JOB_TYPES[item.employmentType as keyof typeof JOB_TYPES] : null,
    posted ? `Posted ${posted}` : null,
    item.deadline ? `Apply by ${deadlineFormat.format(new Date(item.deadline))}` : null,
  ].filter((chip): chip is string => Boolean(chip))
  const label = item.match?.label
  const where = place(item)

  return (
    <li className="flex">
      <Card className="w-full gap-4">
        <div className="flex items-start justify-between gap-gap-sm">
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            {label ? (
              <Badge tone={MATCH_TONE[label]} dot>
                {MATCH_LABELS[label]}
              </Badge>
            ) : null}
            {item.isAffiliated ? <Badge tone="accent">Affiliated</Badge> : null}
          </div>
          <SaveControls jobId={item.id} title={item.title} saved={item.saved} />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="line-clamp-2 text-heading [overflow-wrap:anywhere] text-text-primary">
            {item.title}
          </h3>
          {item.company || where ? (
            <p className="text-body [overflow-wrap:anywhere] text-text-secondary">
              {item.company ? <span className="text-text-primary">{item.company}</span> : null}
              {item.company && where ? " · " : null}
              {where}
            </p>
          ) : null}
        </div>

        {chips.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Details">
            {chips.map((chip) => (
              <li key={chip}>
                <Badge>{chip}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {item.match?.reason ? (
          <p className="bg-neutral-tint p-3 text-body text-text-secondary">
            <span className="font-medium text-text-primary">Lynx: </span>
            {item.match.reason}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-gap-sm pt-1">
          <p className="min-w-0 text-small text-text-secondary">via {sourceCredit(item.source)}</p>
          <Button asChild variant="heroSecondary" className="shrink-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Apply for ${item.title} on ${sourceCredit(item.source)} (opens in a new tab)`}
            >
              Apply on source
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </Button>
        </div>
      </Card>
    </li>
  )
}
