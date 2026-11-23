import { expect, test } from "@playwright/test"

import { expectAlert, logIn, logOut, PASSWORD, signUp, testEmail } from "./helpers"

test.describe("candidate accounts", () => {
  test("sign up, log out, log back in", async ({ page }) => {
    const email = testEmail("candidate")

    await signUp(page, "/signup", { name: "Ada Candidate", email })
    // New candidates start with onboarding (chunk 2.3).
    await expect(page).toHaveURL(/\/app\/onboarding$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Start with your CV.")

    await logOut(page)

    await logIn(page, "/login", email, "WrongPass123")
    await expectAlert(page, "don't match")

    await page.getByLabel("Password").fill(PASSWORD)
    await page.getByRole("button", { name: "Log in", exact: true }).click()
    await expect(page).toHaveURL(/\/app\/onboarding$/)
  })

  test("refuses weak passwords", async ({ page }) => {
    await signUp(page, "/signup", {
      name: "Weak Password",
      email: testEmail("weak"),
      password: "onlyletterspass",
    })
    await expectAlert(page, "stronger password")
    await expect(page).toHaveURL(/\/signup$/)
  })

  test("signed-out visitors are sent to the login page", async ({ page }) => {
    await page.goto("/app/settings")
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsettings$/)
  })

  test("delete account removes access", async ({ page }) => {
    const email = testEmail("delete")
    await signUp(page, "/signup", { name: "Del Candidate", email })
    await expect(page).toHaveURL(/\/app\/onboarding$/)

    await page.goto("/app/settings")
    await page.getByLabel("Type DELETE to confirm").fill("DELETE")
    await page.getByRole("button", { name: "Delete my account" }).click()
    await expect(page).toHaveURL(/\/$/)

    await logIn(page, "/login", email)
    await expectAlert(page, "don't match")
  })
})
