import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { COUNTRIES } from "@lynx/shared/candidate"
import { FEED_VIEWS, FIELDS_OF_WORK } from "@lynx/shared/jobs"
import { Button } from "@lynx/ui/components/button"
import { Headline } from "@lynx/ui/components/headline"
import { Input } from "@lynx/ui/components/input"
import { Notice } from "@lynx/ui/components/notice"
import { Select } from "@lynx/ui/components/select"
import { EmptyState } from "@lynx/ui/components/states"
import { cn } from "@lynx/ui/lib/utils"

import { OpportunityCard } from "@/components/opportunities/opportunity-card"
import { getSessionUser } from "@/lib/auth/session"
import { isOnboarded } from "@/lib/candidate/api"
import { getOpportunities } from "@/lib/opportunities/api"

export const metadata: Metadata = { title: "Opportunities" }

type Params = {
  view?: string
  q?: string
  country?: string
  field?: string
  remote?: string
  saved?: string
  page?: string
}

const HEADLINES: Record<string, string> = {
  jobs: "Jobs from company careers pages, job boards and the Hyperlynx team, ranked for you.",
  internships: "Internships for students and new graduates, ranked for you.",
  scholarships: "Scholarships, fellowships and exchange programmes, open to apply.",
}

/** Only the filters we know, so links and the API get clean values. */
function clean(params: Params): Record<string, string> {
  const out: Record<string, string> = {}
  if (params.view && params.view in FEED_VIEWS) out.view = params.view
  if (params.q?.trim()) out.q = params.q.trim().slice(0, 80)
  if (params.country && params.country in COUNTRIES) out.country = params.country
  if (params.field && params.field in FIELDS_OF_WORK) out.field = params.field
  if (params.remote === "1") out.remote = "1"
  if (params.saved === "1") out.saved = "1"
  const page = Number(params.page)
  if (Number.isInteger(page) && page > 1 && page <= 100) out.page = String(page)
  return out
}

function href(params: Record<string, string>, change: Record<string, string | null>) {
  const next = { ...params }
  for (const [key, value] of Object.entries(change)) {
    if (value === null) delete next[key]
    else next[key] = value
  }
  const query = new URLSearchParams(next).toString()
  return `/app/opportunities${query ? `?${query}` : ""}`
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const user = await getSessionUser()
  if (user && !(await isOnboarded(user.id))) redirect("/app/onboarding")
  const params = clean(await searchParams)
  const view = params.view ?? "jobs"
  const { data, status } = await getOpportunities(params)
  const page = data?.page ?? 1
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const filtered = Boolean(
    params.q || params.country || params.field || params.remote || params.saved
  )

  return (
    <div className="flex flex-col gap-gap-md">
      <Headline as="h1" size="title" title="Opportunities" lede={HEADLINES[view]} />

      <nav aria-label="Kinds of opportunity" className="flex gap-gap-md border-b border-border">
        {Object.entries(FEED_VIEWS).map(([key, label]) => (
          <Link
            key={key}
            href={href({}, { view: key === "jobs" ? null : key })}
            aria-current={view === key ? "page" : undefined}
            className={cn(
              "-mb-px border-b py-3 text-label transition-colors duration-200 ease-standard",
              view === key
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <form
        method="get"
        action="/app/opportunities"
        aria-label="Filter opportunities"
        className="grid gap-gap-sm md:grid-cols-2 md:items-end lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        {view !== "jobs" ? <input type="hidden" name="view" value={view} /> : null}
        <label className="flex flex-col gap-2">
          <span className="text-label text-text-primary">Search</span>
          <Input name="q" defaultValue={params.q} placeholder="Title or company" maxLength={80} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label text-text-primary">Country</span>
          <Select name="country" defaultValue={params.country ?? ""}>
            <option value="">Your countries</option>
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label text-text-primary">Field</span>
          <Select name="field" defaultValue={params.field ?? ""}>
            <option value="">Any field</option>
            {Object.entries(FIELDS_OF_WORK).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap items-center gap-gap-md lg:h-11">
          <label className="flex items-center gap-2 text-body text-text-primary">
            <input
              type="checkbox"
              name="remote"
              value="1"
              defaultChecked={params.remote === "1"}
              className="size-4 accent-accent"
            />
            Remote
          </label>
          <label className="flex items-center gap-2 text-body text-text-primary">
            <input
              type="checkbox"
              name="saved"
              value="1"
              defaultChecked={params.saved === "1"}
              className="size-4 accent-accent"
            />
            Saved
          </label>
          <Button type="submit" variant="heroSecondary">
            Show
          </Button>
        </div>
      </form>

      {!data ? (
        <Notice tone="error" title="Couldn't load opportunities">
          The service didn&apos;t answer (HTTP {status}). Try again in a moment.
        </Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-gap-sm">
            <p className="text-small text-text-secondary tabular">
              {data.total.toLocaleString("en-GB")}{" "}
              {data.total === 1 ? "opportunity" : "opportunities"}
              {filtered ? (data.total === 1 ? " matches your filters" : " match your filters") : ""}
              {pages > 1 ? ` · page ${page} of ${pages}` : ""}
            </p>
            {filtered ? (
              <Link
                href={href({}, { view: view === "jobs" ? null : view })}
                className="text-label text-text-primary underline-offset-4 hover:underline"
              >
                Clear filters
              </Link>
            ) : null}
          </div>

          {view !== "scholarships" && data.matching.status !== "ready" ? (
            <Notice title="Lynx is ranking jobs for you">
              {data.matching.status === "updating"
                ? "Your profile changed, so Lynx is updating your matches. This usually takes a few minutes; until then you see your previous ranking or the newest jobs in your countries."
                : "Your first matches arrive a few minutes after you finish your profile. Until then, here are the newest jobs in your countries."}
            </Notice>
          ) : null}

          {data.items.length === 0 ? (
            <EmptyState
              title={params.saved ? "Nothing saved yet." : "Nothing here yet."}
              description={
                params.saved
                  ? "Save opportunities you like and they'll wait for you here."
                  : filtered
                    ? "Try fewer filters or another search."
                    : "New opportunities arrive every day. Check back tomorrow."
              }
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2" aria-label="Opportunities">
              {data.items.map((item) => (
                <OpportunityCard key={item.id} item={item} />
              ))}
            </ul>
          )}

          {pages > 1 ? (
            <nav aria-label="Pages" className="flex items-center justify-between gap-gap-sm">
              {page > 1 ? (
                <Link
                  href={href(params, { page: page === 2 ? null : String(page - 1) })}
                  className="text-label text-text-primary underline-offset-4 hover:underline"
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {page < pages ? (
                <Link
                  href={href(params, { page: String(page + 1) })}
                  className="text-label text-text-primary underline-offset-4 hover:underline"
                >
                  Next →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
