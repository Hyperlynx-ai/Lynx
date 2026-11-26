import type { paths } from "@lynx/types/api"

import { apiFetchAsUser } from "@/lib/api/server"

export type FeedResponse =
  paths["/me/opportunities"]["get"]["responses"]["200"]["content"]["application/json"]
export type Opportunity = FeedResponse["items"][number]
export type FeedParams = NonNullable<paths["/me/opportunities"]["get"]["parameters"]["query"]>

/** One page of the candidate's feed, or null if the API failed. */
export async function getOpportunities(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString()
  const res = await apiFetchAsUser(`/me/opportunities${query ? `?${query}` : ""}`)
  if (!res.ok) return { data: null, status: res.status }
  return { data: (await res.json()) as FeedResponse, status: res.status }
}
