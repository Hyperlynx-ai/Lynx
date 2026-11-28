import { expect, test } from "@playwright/test"

import { onboardedCandidate } from "./helpers"

test("profile: what Lynx knows, tell Lynx more, download my data", async ({ page }) => {
  await onboardedCandidate(page, "Pia Profile", "profile")
  await page.getByRole("link", { name: "Profile", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What Lynx knows about you")
  await expect(page.getByText("Lynx doesn't know anything about you yet.")).toBeVisible()

  // With the AI service running (local dev) Lynx notes facts; without it
  // (CI) the candidate sees a clear message.
  await page.getByLabel("Tell Lynx more").fill("I'd like to move to Amsterdam next year.")
  await page.getByRole("button", { name: "Tell Lynx" }).click()
  const noted = page.getByRole("status").filter({ hasText: /Lynx noted|didn't find anything/ })
  const failed = page.getByRole("alert").filter({ hasText: /Lynx can't read|couldn't read/ })
  await expect(noted.or(failed)).toBeVisible({ timeout: 60_000 })

  // The answers from onboarding are editable here.
  await expect(page.getByLabel("Roles you're looking for")).toHaveValue("Data Analyst")

  const download = await page.request.get("/app/profile/export")
  expect(download.ok()).toBe(true)
  expect(download.headers()["content-disposition"]).toContain("attachment")
  const data = await download.json()
  expect(data.format).toBe("hyperlynx-export-v1")
  expect(data.candidate.targetRoles).toEqual(["Data Analyst"])
  expect(data.consents).toHaveLength(4)
})
