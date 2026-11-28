import { expect, test } from "@playwright/test"

import { onboardedCandidate, seedMatchedJob } from "./helpers"

test("candidates see ranked opportunities, save one and hide one", async ({ page }) => {
  const email = await onboardedCandidate(page, "Oli Opportunities", "feed")
  const title = `Data Analyst E2E ${Date.now()}`
  const cleanup = await seedMatchedJob(email, title)
  try {
    await page.getByRole("link", { name: "See your opportunities" }).click()
    await expect(page).toHaveURL(/\/app\/opportunities$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Opportunities")

    const card = page.getByRole("listitem").filter({ hasText: title })
    await expect(card).toContainText("Strong match")
    await expect(card).toContainText("Lynx: Your SQL and dashboard work fits this analyst role.")
    await expect(card).toContainText("via Jobicy")
    await expect(card.getByRole("link", { name: /Apply for/ })).toHaveAttribute(
      "href",
      /^https:\/\/example\.test\/jobs\//
    )

    await card.getByRole("button", { name: `Save ${title}` }).click()
    await expect(card.getByRole("button", { name: `Unsave ${title}` })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await page.getByLabel("Saved").check()
    await page.getByRole("button", { name: "Show" }).click()
    await expect(page).toHaveURL(/saved=1/)
    await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible()

    await page.goto("/app/opportunities")
    await page
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: `Hide ${title}` })
      .click()
    await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0)

    await page.getByRole("link", { name: "Internships" }).click()
    await expect(page).toHaveURL(/view=internships/)
    await expect(page.getByText("Internships for students and new graduates")).toBeVisible()
  } finally {
    await cleanup()
  }
})
