import { Badge } from "@lynx/ui/components/badge"
import type { Metadata } from "next"

import type { paths } from "@lynx/types/api"
import { Headline } from "@lynx/ui/components/headline"
import { Notice } from "@lynx/ui/components/notice"
import { EmptyState } from "@lynx/ui/components/states"

import { apiFetchAsUser } from "@/lib/api/server"

export const metadata: Metadata = { title: "Admin · Users" }

type UsersResponse = paths["/admin/users"]["get"]["responses"]["200"]["content"]["application/json"]

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "never")

export default async function AdminUsersPage() {
  const res = await apiFetchAsUser("/admin/users?perPage=100")
  const data = res.ok ? ((await res.json()) as UsersResponse) : null

  return (
    <div className="flex flex-col gap-gap-md">
      <Headline
        as="h1"
        size="title"
        title="Users"
        lede="Every account on Hyperlynx, newest first."
      />
      {!data ? (
        <Notice tone="error" title="Couldn't load users">
          The API didn&apos;t answer (HTTP {res.status}). Try again in a moment.
        </Notice>
      ) : data.users.length === 0 ? (
        <EmptyState title="No accounts yet." description="They'll appear here as people sign up." />
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Email", "Role", "Signed up with", "Created", "Last sign-in"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-label text-text-secondary"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-b border-border-subtle last:border-b-0">
                  <td className="px-4 py-3 text-body text-text-primary">{user.fullName ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                    {user.email ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                    {user.provider ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-mono text-text-secondary">
                    {formatDate(user.lastSignInAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.hasMore ? (
        <p className="font-mono text-mono text-text-secondary">
          $ showing the newest 100 accounts · paging comes with the full admin console (10.1)
        </p>
      ) : null}
    </div>
  )
}
