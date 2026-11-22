import { expect, test } from "@playwright/test"

import { expectAlert, logIn, logOut, signUp, testEmail } from "./helpers"

test.describe("recruiter accounts", () => {
  test("personal email addresses are refused", async ({ page }) => {
    await signUp(page, "/recruiters/signup", {
      name: "Personal Mail",
      email: testEmail("recruiter", "gmail.com"),
    })
    await expectAlert(page, "need a work email")
    await expect(page).toHaveURL(/\/recruiters\/signup$/)
  })

  test("work email sign-up lands in the recruiter workspace", async ({ page }) => {
    await signUp(page, "/recruiters/signup", {
      name: "Rita Recruiter",
      email: testEmail("recruiter", "acme-recruiting.example"),
    })
    await expect(page).toHaveURL(/\/recruiter$/)
    await expect(page.getByText("Your account is waiting for approval")).toBeVisible()
  })

  test("one role per account: wrong login page and wrong area", async ({ page }) => {
    const email = testEmail("recruiter", "acme-recruiting.example")
    await signUp(page, "/recruiters/signup", { name: "Rob Recruiter", email })
    await expect(page).toHaveURL(/\/recruiter$/)

    // A recruiter opening the candidate area is sent back to their own.
    await page.goto("/app")
    await expect(page).toHaveURL(/\/recruiter$/)

    await logOut(page)

    // A recruiter using the candidate login page is moved to the recruiter login.
    await logIn(page, "/login", email)
    await expect(page).toHaveURL(/\/recruiters\/login\?error=wrong-area&account=recruiter$/)
    await expect(page.getByRole("status").first()).toContainText("recruiter account")
  })
})
