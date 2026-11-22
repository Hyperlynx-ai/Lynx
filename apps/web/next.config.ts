import type { NextConfig } from "next"

/**
 * The browser only ever talks to this app. Requests to /api/* are forwarded
 * to apps/api, so there is one origin (no CORS) and the API URL never
 * reaches the browser. API_URL is set per environment in Vercel.
 */
const apiUrl = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "")

const nextConfig: NextConfig = {
  transpilePackages: ["@lynx/ui"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }]
  },
}

export default nextConfig
