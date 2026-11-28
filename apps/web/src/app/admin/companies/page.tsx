import type { Metadata } from "next"

import type { paths } from "@lynx/types/api"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"

import { CompanyControls } from "@/components/admin/company-controls"
import { CompanyForm } from "@/components/admin/company-form"
import { apiFetchAsUser } from "@/lib/api/server"
import { ATS_LABELS, careersUrl } from "@/lib/ats"

export const metadata: Metadata = { title: "Admin · Companies" }

type CompaniesResponse =
  paths["/admin/companies"]["get"]["responses"]["200"]["content"]["application/json"]

export default async function AdminCompaniesPage() {
  const res = await apiFetchAsUser("/admin/companies")
  const data = res.ok ? ((await res.json()) as CompaniesResponse) : null
  const on = data?.companies.filter((c) => c.enabled).length ?? 0

  return (
    <div className="flex flex-col gap-gap-md">
      <Headline
        as="h1"
        size="title"
        title="Company boards"
        lede={
          data
            ? `${on} of ${data.companies.length} on. Jobs come from each company's own careers page; a new board is read on the next run of its system's source.`
            : "Companies whose careers pages we read."
        }
      />
      {!data ? (
        <Notice tone="error" title="Couldn't load companies">
          The API didn&apos;t answer (HTTP {res.status}). Try again in a moment.
        </Notice>
      ) : (
        <>
          <CompanyForm />
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Company", "System", "Careers page", ""].map((h, i) => (
                    <th key={i} scope="col" className="px-4 py-3 text-label text-text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.companies.map((c) => (
                  <tr key={c.id} className="border-b border-border-subtle last:border-b-0">
                    <td className="px-4 py-3 text-label text-text-primary">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                      {ATS_LABELS[c.ats] ?? c.ats}
                    </td>
                    <td className="px-4 py-3 font-mono text-mono">
                      <a
                        href={careersUrl(c.ats, c.slug)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
                      >
                        {c.slug}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <CompanyControls id={c.id} name={c.name} enabled={c.enabled} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
