import { apiFetchAsUser } from "@/lib/api/server"

/** "Download my data": streams the API's JSON export as a file download. */
export async function GET() {
  const res = await apiFetchAsUser("/me/export")
  if (!res.ok) {
    return new Response("We couldn't prepare your data. Please try again.", { status: res.status })
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? 'attachment; filename="hyperlynx-data.json"',
      "Cache-Control": "no-store",
    },
  })
}
