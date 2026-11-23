import { expect, test } from "@playwright/test"

import { signUp, testEmail } from "./helpers"

test("a new candidate completes onboarding and lands on home", async ({ page }) => {
  await signUp(page, "/signup", { name: "Olu Onboard", email: testEmail("onboard") })
  await expect(page).toHaveURL(/\/app\/onboarding$/)

  // Step 1: the CV can wait.
  await page.getByRole("link", { name: /Skip for now/ }).click()

  // Step 2: answers are required; errors show in red until fixed.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("looking for")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByText("Add at least one role")).toBeVisible()

  await page.getByLabel("Roles you're looking for").fill("Staff Nurse, ICU Nurse")
  await page.getByText("United Arab Emirates").click()
  await page.getByText("Germany").click()
  await page.getByLabel("Work experience").selectOption("mid")
  await page.getByLabel("Highest education").selectOption("bachelors")
  await page.getByText("A new job (I'm working now)").click()
  await page.getByLabel("Work authorization").selectOption("needs_sponsorship")
  await page.getByRole("button", { name: "Continue" }).click()

  // Step 3: everything is off until turned on.
  await expect(page).toHaveURL(/step=3$/)
  await expect(page.getByLabel("Also show them my email and phone")).toBeDisabled()
  await page.getByText("Let approved recruiters find my profile").click()
  await expect(page.getByLabel("Also show them my email and phone")).toBeEnabled()
  await page.getByText("Email me matching jobs every 2 days").click()
  await page.getByRole("button", { name: "Finish" }).click()

  await expect(page).toHaveURL(/\/app$/)
  await expect(
    page.getByText("Staff Nurse, ICU Nurse · United Arab Emirates, Germany")
  ).toBeVisible()

  // The choices are editable in Settings.
  await page.goto("/app/settings")
  await expect(page.getByLabel("Email me matching jobs every 2 days")).toBeChecked()
  await expect(page.getByLabel("Send me the weekly newsletter")).not.toBeChecked()
})
