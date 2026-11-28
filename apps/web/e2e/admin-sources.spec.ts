import { expect, test } from "@playwright/test"

import { logIn, makeAdmin, PASSWORD, signUp, testEmail } from "./helpers"

test("admins switch job sources on and ask for a run", async ({ page }) => {
  const email = testEmail("admin")
  await signUp(page, "/signup", { name: "Ada Admin", email })
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await makeAdmin(email)
  await logIn(page, "/login", email, PASSWORD)

  await page.goto("/admin/sources")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Job sources")
  const row = page.getByRole("row").filter({ hasText: "Jobicy" })
  const toggle = row.getByRole("switch")
  const wasOn = (await toggle.getAttribute("aria-checked")) === "true"

  if (!wasOn) await toggle.click()
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  // An earlier run of this test may have left a request pending.
  const run = row.getByRole("button", { name: /Run now|Run requested/ })
  if (await run.isEnabled()) await run.click()
  await expect(row.getByRole("button", { name: "Run requested" })).toBeVisible()

  // Leave the shared local database as it was.
  await row.getByRole("switch").click()
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "false")
})

test("admins add, switch off and remove a company board", async ({ page }) => {
  const email = testEmail("boards")
  await signUp(page, "/signup", { name: "Bo Boards", email })
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await makeAdmin(email)
  await logIn(page, "/login", email, PASSWORD)

  await page.goto("/admin/companies")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Company boards")
  const slug = `e2e-${Date.now()}`
  await page.getByLabel("System").selectOption("lever")
  await page.getByLabel("Board name").fill(slug)
  await page.getByLabel("Company", { exact: true }).fill("E2E Test Co")
  await page.getByRole("button", { name: "Add board" }).click()

  const row = page.getByRole("row").filter({ hasText: slug })
  await expect(row).toContainText("Lever")
  await expect(row.getByRole("link", { name: slug })).toHaveAttribute(
    "href",
    `https://jobs.lever.co/${slug}`
  )
  await row.getByRole("switch").click()
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "false")

  // The same board twice is refused.
  await page.getByLabel("System").selectOption("lever")
  await page.getByLabel("Board name").fill(slug)
  await page.getByLabel("Company", { exact: true }).fill("E2E Test Co")
  await page.getByRole("button", { name: "Add board" }).click()
  await expect(page.getByText("That board is already listed.")).toBeVisible()

  await row.getByRole("button", { name: "Remove E2E Test Co" }).click()
  await row.getByRole("button", { name: "Remove E2E Test Co" }).click()
  await expect(page.getByRole("row").filter({ hasText: slug })).toHaveCount(0)
})

test("candidates can't open the admin console", async ({ page }) => {
  await signUp(page, "/signup", { name: "Cam Candidate", email: testEmail("notadmin") })
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await page.goto("/admin/sources")
  await expect(page).not.toHaveURL(/\/admin/)
})
