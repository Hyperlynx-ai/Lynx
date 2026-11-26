import { COUNTRIES } from "@lynx/shared/candidate"
import { JOB_TYPES, MATCH_LABELS } from "@lynx/shared/jobs"
import { Button } from "@lynx/ui/components/button"
import { StatusDot } from "@lynx/ui/components/status-dot"

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

/** One opportunity in the feed: match, facts, Lynx's reason, source and actions. */
export function OpportunityCard({ item }: { item: Opportunity }) {
  const facts = [
    item.company,
    place(item),
    item.employmentType ? JOB_TYPES[item.employmentType as keyof typeof JOB_TYPES] : null,
    postedAgo(item.postedAt) ? `Posted ${postedAgo(item.postedAt)}` : null,
    item.deadline ? `Apply by ${deadlineFormat.format(new Date(item.deadline))}` : null,
  ].filter(Boolean)
  const label = item.match?.label

  return (
    <li className="flex flex-col gap-gap-sm border-b border-border px-0 py-6">
      {label || item.isAffiliated ? (
        <div className="flex flex-wrap items-center gap-gap-sm font-mono text-mono">
          {label ? (
            <span className="flex items-center gap-2 text-text-primary">
              <StatusDot
                state={label === "strong" ? "ok" : "unknown"}
                className={label === "partial" ? "hidden" : undefined}
              />
              {MATCH_LABELS[label]}
            </span>
          ) : null}
          {item.isAffiliated ? (
            <span className="border border-border px-2 text-text-primary">Affiliated</span>
          ) : null}
        </div>
      ) : null}
      <h3 className="text-label text-text-primary">{item.title}</h3>
      {facts.length ? (
        <p className="font-mono text-mono text-text-secondary">{facts.join(" · ")}</p>
      ) : null}
      {item.match?.reason ? (
        <p className="max-w-3xl text-body text-text-secondary">
          <span className="text-text-primary">Lynx: </span>
          {item.match.reason}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-gap-sm">
        <p className="font-mono text-mono text-text-secondary">via {sourceCredit(item.source)}</p>
        <div className="flex flex-wrap items-center gap-gap-md">
          <SaveControls jobId={item.id} title={item.title} saved={item.saved} />
          <Button asChild variant="heroSecondary">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Apply for ${item.title} on ${sourceCredit(item.source)} (opens in a new tab)`}
            >
              Apply on source ↗
            </a>
          </Button>
        </div>
      </div>
    </li>
  )
}
