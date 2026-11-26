import type { Metadata } from "next"

import type { paths } from "@lynx/types/api"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"
import { StatusDot } from "@lynx/ui/components/status-dot"

import { SourceControls } from "@/components/admin/source-controls"
import { apiFetchAsUser } from "@/lib/api/server"

export const metadata: Metadata = { title: "Admin · Job sources" }

type SourcesResponse =
  paths["/admin/sources"]["get"]["responses"]["200"]["content"]["application/json"]

const KIND: Record<string, string> = {
  curated: "Curated",
  api: "API",
  ats: "Company boards",
  scraper: "Scraper",
}

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
})
const fmt = (iso: string | null) => (iso ? `${when.format(new Date(iso))} UTC` : "never")

export default async function AdminSourcesPage() {
  const res = await apiFetchAsUser("/admin/sources")
  const data = res.ok ? ((await res.json()) as SourcesResponse) : null
  const names = Object.fromEntries((data?.sources ?? []).map((s) => [s.id, s.name]))

  return (
    <div className="flex flex-col gap-gap-md">
      <Headline
        as="h1"
        size="title"
        lead="Job sources."
        muted={
          data
            ? `${data.activeJobs.toLocaleString("en-GB")} active jobs. Every source runs daily at 01:30 UTC; "Run now" usually starts within minutes (within the hour at most).`
            : "Where opportunities come from."
        }
      />
      {!data ? (
        <Notice tone="error" title="Couldn't load sources">
          The API didn&apos;t answer (HTTP {res.status}). Try again in a moment.
        </Notice>
      ) : (
        <>
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Source", "Kind", "Health", "Active jobs", "Last run", ""].map((h, i) => (
                    <th key={i} scope="col" className="px-4 py-3 text-label text-text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border-subtle align-top last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="text-label text-text-primary">{s.name}</p>
                      {s.notes ? (
                        <p className="mt-1 max-w-sm text-body text-text-secondary">{s.notes}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                      {KIND[s.kind] ?? s.kind}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-mono text-mono text-text-primary">
                        <StatusDot
                          state={
                            s.lastStatus === "ok"
                              ? "ok"
                              : s.lastStatus === "failed"
                                ? "down"
                                : "unknown"
                          }
                        />
                        {s.lastStatus ?? "no runs yet"}
                      </span>
                      {s.lastError ? (
                        <p className="mt-1 max-w-xs font-mono text-mono text-error">
                          ! {s.lastError}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-mono text-text-primary">
                      {s.activeJobs.toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                      {fmt(s.lastRunAt)}
                    </td>
                    <td className="px-4 py-3">
                      <SourceControls
                        id={s.id}
                        name={s.name}
                        enabled={s.enabled}
                        runRequested={Boolean(s.runRequestedAt)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section aria-labelledby="runs-heading" className="flex flex-col gap-gap-sm">
            <h2 id="runs-heading" className="text-label text-text-primary">
              Recent runs
            </h2>
            {data.runs.length === 0 ? (
              <p className="text-body text-text-secondary">No runs yet.</p>
            ) : (
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Started",
                        "Source",
                        "Status",
                        "Fetched",
                        "Kept",
                        "New",
                        "Updated",
                        "Expired",
                      ].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 text-label text-text-secondary"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono text-mono">
                    {data.runs.map((r) => (
                      <tr key={r.id} className="border-b border-border-subtle last:border-b-0">
                        <td className="px-4 py-2 text-text-secondary">{fmt(r.startedAt)}</td>
                        <td className="px-4 py-2 text-text-primary">
                          {names[r.sourceId] ?? r.sourceId}
                        </td>
                        <td
                          className={
                            r.status === "failed"
                              ? "px-4 py-2 text-error"
                              : "px-4 py-2 text-text-primary"
                          }
                        >
                          {r.status}
                        </td>
                        {[r.fetched, r.kept, r.inserted, r.updated, r.expired].map((n, i) => (
                          <td key={i} className="px-4 py-2 text-text-primary">
                            {n}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
