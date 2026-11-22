import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests for the key user journeys (roadmap 1.5, policy TEST-02).
 * They need the local Supabase stack (`pnpm db:start`) and the env files from
 * `.env.example`; `pnpm e2e` at the repo root runs them. The web app and the
 * API are started automatically (or reused if `pnpm dev` is already running).
 */
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: !isCI,
      timeout: 120_000,
      cwd: "../..",
    },
    {
      command: isCI ? "pnpm --filter web start" : "pnpm --filter web dev",
      url: "http://localhost:3000",
      reuseExistingServer: !isCI,
      timeout: 180_000,
      cwd: "../..",
    },
  ],
})
