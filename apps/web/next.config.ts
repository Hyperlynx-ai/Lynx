import { withRelatedProject } from "@vercel/related-projects"
import type { NextConfig } from "next"

/**
 * The browser only ever talks to this app. Requests to /api/* are forwarded
 * to apps/api, so there is one origin (no CORS) and the API URL never
 * reaches the browser.
 *
 * On Vercel, `relatedProjects` in vercel.json links this app to the lynx-api
 * project: production uses the API's production deployment, and a PR preview
 * uses the API preview from the same branch. Locally (or if that data is
 * missing) API_URL is used.
 */
const apiUrl = withRelatedProject({
  projectName: "lynx-api",
  defaultHost: process.env.API_URL ?? "http://127.0.0.1:4000",
}).replace(/\/+$/, "")

const nextConfig: NextConfig = {
  transpilePackages: ["@lynx/ui"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }]
  },
}

export default nextConfig
