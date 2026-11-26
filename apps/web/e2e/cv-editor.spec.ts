import { expect, test } from "@playwright/test"

import { onboardedCandidate, seedParsedCv } from "./helpers"

test("CV editor: edit by hand, save a version, use it for matching", async ({ page }) => {
  const email = await onboardedCandidate(page, "Eddie Editor", "editor")
  await seedParsedCv(email)

  await page.goto("/app/cv")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aarav Sharma.")
  await page.getByRole("link", { name: "Edit with Lynx" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Edit your CV.")

  // Hand edits: nothing is saved until "Save as version 2".
  await page.getByLabel("Headline").fill("Senior Backend Engineer")
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("Backend engineer building payment APIs.")
  await page.getByPlaceholder("Name this version (optional)").fill("Sharper summary")
  await page.getByRole("button", { name: "Save as version 2" }).click()
  await expect(page).toHaveURL(/version=2$/)

  const versions = page.getByRole("region", { name: "Versions" })
  await expect(versions.getByText("Sharper summary")).toBeVisible()

  // A newly read CV is used for matching; switch to version 2.
  await expect(versions.locator("li").filter({ hasText: "used for matching" })).toHaveCount(1)
  await versions.getByRole("button", { name: "Use for matching" }).click()
  await expect(versions.locator("li").filter({ hasText: "v2" })).toContainText("used for matching")

  // The CV page shows the latest version.
  await page.goto("/app/cv")
  await expect(page.getByText("Senior Backend Engineer")).toBeVisible()
  await expect(page.getByText("Backend engineer building payment APIs.")).toBeVisible()

  // Asking Lynx shows a suggestion (AI running) or a clear message (CI).
  await page.getByRole("link", { name: "Edit with Lynx" }).click()
  await page.getByRole("button", { name: "ask lynx →" }).first().click()
  await page.getByPlaceholder("e.g. Make the bullet points more specific").fill("Make it shorter")
  await page.getByRole("button", { name: "Ask", exact: true }).click()
  const suggestion = page.getByLabel("Lynx's suggestion")
  const failed = page.getByRole("alert").filter({ hasText: /Lynx/ })
  await expect(suggestion.or(failed)).toBeVisible({ timeout: 90_000 })
})
