import { expect, test } from "@playwright/test"

import { logIn, makeAdmin, PASSWORD, signUp, testEmail } from "./helpers"

test("admins switch job sources on and ask for a run", async ({ page }) => {
  const email = testEmail("admin")
  await signUp(page, "/signup", { name: "Ada Admin", email })
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await makeAdmin(email)
  await logIn(page, "/login", email, PASSWORD)

  await page.goto("/admin/sources")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Job sources.")
  const row = page.getByRole("row").filter({ hasText: "Jobicy" })
  const toggle = row.getByRole("switch")
  const wasOn = (await toggle.getAttribute("aria-checked")) === "true"

  if (!wasOn) await toggle.click()
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  await row.getByRole("button", { name: /Run now|Run requested/ }).click()
  await expect(row.getByRole("button", { name: "Run requested" })).toBeVisible()

  // Leave the shared local database as it was.
  await row.getByRole("switch").click()
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "false")
})

test("candidates can't open the admin console", async ({ page }) => {
  await signUp(page, "/signup", { name: "Cam Candidate", email: testEmail("notadmin") })
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await page.goto("/admin/sources")
  await expect(page).not.toHaveURL(/\/admin/)
})
