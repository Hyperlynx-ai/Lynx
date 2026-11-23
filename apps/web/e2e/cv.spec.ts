import { join } from "node:path"

import { expect, test } from "@playwright/test"

import { expectAlert, signUp, testEmail } from "./helpers"

const SAMPLE_CV = join(import.meta.dirname, "..", "public", "samples", "hyperlynx-sample-cv.pdf")

test.describe("candidate CV", () => {
  test("upload a CV, see what Lynx read (or keep it for a retry), delete it", async ({ page }) => {
    // The e2e stack runs Supabase, the API and the web app, but no AI
    // service, so this checks everything up to the AI call: the upload to
    // the private bucket, row-level security and the API's error handling.
    await signUp(page, "/signup", { name: "Cara Cv", email: testEmail("cv") })
    await expect(page).toHaveURL(/\/app\/onboarding$/)

    await page.goto("/app/cv")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your CV.")
    await expect(page.getByText("Demo: please use the sample CV")).toBeVisible()

    const sample = await page.request.get("/samples/hyperlynx-sample-cv.pdf")
    expect(sample.ok()).toBe(true)
    expect(sample.headers()["content-type"]).toContain("pdf")

    await page.getByLabel("CV file").setInputFiles(SAMPLE_CV)

    // With the AI service running (local dev with a key) Lynx reads the
    // sample; without it (CI) the file is kept and can be retried.
    const parsed = page.getByRole("heading", { level: 1, name: /Aarav Sharma/ })
    const kept = page.getByRole("alert").filter({ hasText: "Lynx couldn't read this file" })
    await expect(parsed.or(kept)).toBeVisible({ timeout: 90_000 })
    if (await kept.isVisible()) {
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
    } else {
      await expect(page.getByText("Northwind Payments")).toBeVisible()
    }
    await expect(page.getByText("hyperlynx-sample-cv.pdf")).toBeVisible()

    await page.getByRole("button", { name: "Delete this CV" }).click()
    await page.getByRole("button", { name: "Delete CV" }).click()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your CV.")
    await expect(page.getByText("hyperlynx-sample-cv.pdf")).toBeHidden()
  })

  test("rejects files that aren't PDF or DOCX before uploading", async ({ page }) => {
    await signUp(page, "/signup", { name: "Tim Type", email: testEmail("cvtype") })
    await expect(page).toHaveURL(/\/app\/onboarding$/)
    await page.goto("/app/cv")
    await page.getByLabel("CV file").setInputFiles({
      name: "cv.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a cv"),
    })
    await expectAlert(page, "PDF or Word")
  })
})
